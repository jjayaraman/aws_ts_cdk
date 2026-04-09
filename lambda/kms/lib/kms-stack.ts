import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';

export class KmsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. KMS Key for Client-Side Encryption
    const kmsKey = new kms.Key(this, 'S3CseKey', {
      alias: 'alias/s3-cse-key',
      description: 'Key for S3 Client-Side Encryption',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pendingWindow: cdk.Duration.days(7),
    });

    // 2. S3 Bucket
    const bucket = new s3.Bucket(this, 'S3CseBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      encryption: s3.BucketEncryption.S3_MANAGED, // Server-side is still recommended as baseline
    });

    // 3. Lambda Function
    const cseLambda = new lambda.Function(this, 'S3CseHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/src')),
      environment: {
        KMS_KEY_ALIAS_S3_CSE: kmsKey.keyArn, // Using ARN as the generator key ID
        S3_BUCKET: bucket.bucketName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        // Internal endpoint for Lambda to reach LocalStack
        AWS_ENDPOINT_URL: `http://localstack:4566`,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // 4. Grant Permissions
    kmsKey.grantEncryptDecrypt(cseLambda);
    bucket.grantReadWrite(cseLambda);

    // 5. API Gateway
    const api = new apigateway.RestApi(this, 'S3CseApi', {
      restApiName: 'S3 Client-Side Encryption Service',
    });

    const uploadResource = api.root.addResource('upload');
    uploadResource.addMethod('POST', new apigateway.LambdaIntegration(cseLambda));

    const downloadResource = api.root.addResource('download');
    downloadResource.addMethod('GET', new apigateway.LambdaIntegration(cseLambda));

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
    });
  }
}
