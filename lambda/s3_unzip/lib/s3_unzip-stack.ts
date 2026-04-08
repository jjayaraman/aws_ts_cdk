import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'

import * as s3 from 'aws-cdk-lib/aws-s3'
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs'
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda'
import { RetentionDays } from 'aws-cdk-lib/aws-logs'
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications'
import { join } from 'path'

export class S3UnzipStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // The code that defines your stack goes here
    const bucket = new s3.Bucket(this, 'S3UnzipBucket', {
      bucketName: 's3-unzip-bucket',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })
    // /Users/jay/git_jay/aws_ts_cdk/lambda/s3_unzip/lambda
    // /Users/jay/git_jay/aws_ts_cdk/lambda/s3_unzip/dist/lambda
    const lambdaFunction = new lambda.NodejsFunction(this, 'S3UnzipLambda', {
      runtime: Runtime.NODEJS_18_X,
      entry: join(__dirname, '../lambda/unzip_lambda.ts'),
      handler: 'handler',
      bundling: {
        minify: false,
        sourceMap: true,
        target: 'ES2020',
        tsconfig: join(__dirname, '../tsconfig.json'),
      },
      timeout: cdk.Duration.minutes(10),
      memorySize: 1024,
      logRetention: RetentionDays.ONE_WEEK,
    })

    lambdaFunction.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY)

    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new LambdaDestination(lambdaFunction),
      { suffix: '.zip' }
    )
    bucket.grantReadWrite(lambdaFunction)
  }
}
