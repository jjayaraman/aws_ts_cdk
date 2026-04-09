
# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template

----

Testing with Localstack

npm run localstack-bootstrap
npm run localstack-deploy

./test-localstack.sh <API_URL>

Use the ApiUrl from the deployment output with your test script:

Example outputs:
KmsStack.ApiUrl = https://zhwl8e01me.execute-api.localhost.localstack.cloud:4566/prod/
KmsStack.S3CseApiEndpoint8C469F73 = https://zhwl8e01me.execute-api.localhost.localstack.cloud:4566/prod/
Stack ARN: