import * as cdk from 'aws-cdk-lib';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { aws_s3 as s3, aws_apigatewayv2 as apigateway, aws_lambda as lambda, aws_iam as iam } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';

// This stack creates resources for the file management service
export class CdkStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Create a table to store file metadata
        const fileTable = new Table(this, 'FileTable', {
            partitionKey: { name: 'id', type: AttributeType.STRING },
            tableName: 'fileTable',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            billingMode: BillingMode.PROVISIONED,
            readCapacity: 2,
            writeCapacity: 2
        });

        // Create a bucket to store files
        const fileBucket = new s3.Bucket(this, 'FileBucket', {
            versioned: true,
            bucketName: 'ywt-file-bucket',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            encryption: s3.BucketEncryption.S3_MANAGED,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
        });

        // // Create a bucket to store frontend
        // new s3.Bucket(this, 'FrontendBucket', {
        //     versioned: true,
        //     bucketName: 'ywt-frontend-bucket',
        //     removalPolicy: cdk.RemovalPolicy.DESTROY,
        //     autoDeleteObjects: true,
        //     encryption: s3.BucketEncryption.S3_MANAGED,
        //     blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
        // });

        // Create a role for fileUpload lambda function
        const fileTableInputRole = new iam.Role(this, 'FileInputRole', {
            roleName: 'fileInputRole',
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
                iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess')
            ]
        });

        fileTableInputRole.node.addDependency(fileTable);
        fileTable.grantWriteData(fileTableInputRole);

        // Create a role for ec2 instance to access fileBucket
        const fileTableOutputRole = new iam.Role(this, 'FileOutputRole', {
            roleName: 'fileOutputRole',
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess')
            ]
        });

        fileBucket.grantReadWrite(fileTableOutputRole);
        fileTable.grantReadWriteData(fileTableOutputRole);
        fileTableOutputRole.node.addDependency(fileTable, fileBucket);

        // Create a Lambda function to update file id and file input path in dynamoDB
        const updateFileLambda = new lambda.Function(this, 'UpdateFileLambda', {
            runtime: lambda.Runtime.NODEJS_LATEST,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('lambdas/uploadToDynamoDB'),
            role: fileTableInputRole,
            environment: {
                ddbTable: fileTable.tableName
            }
        });

        updateFileLambda.node.addDependency(fileTable, fileTableInputRole);

        // Create a API Gateway
        // [TODO] May add cors later
        const fileInputIntegration = new HttpLambdaIntegration('fileInputIntegration', updateFileLambda);

        const api = new apigateway.HttpApi(this, 'FileApi', {
            apiName: 'fileApi',
            description: 'This service creates a new item of text input and file input path in dynamoDB',
        });

        api.addRoutes({
            path: '/fileInputData',
            methods: [apigateway.HttpMethod.POST],
            integration: fileInputIntegration
        });
    }
}
