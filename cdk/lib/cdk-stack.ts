import * as cdk from 'aws-cdk-lib';
import { AttributeType, BillingMode, Table, StreamViewType } from 'aws-cdk-lib/aws-dynamodb';
import {
    aws_s3 as s3,
    aws_apigatewayv2 as apigateway,
    aws_lambda as lambda,
    aws_iam as iam,
    aws_s3_deployment as s3deploy,
    aws_ec2 as ec2,
    aws_lambda_event_sources as eventsources,
} from 'aws-cdk-lib';
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
            writeCapacity: 2,
            stream: StreamViewType.NEW_IMAGE
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

        // Create a Lambda function to update file id and file input path in dynamoDB
        const createFileMetaLambda = new lambda.Function(this, 'CreateFileMetaLambda', {
            functionName: 'createFileMeta',
            runtime: lambda.Runtime.NODEJS_LATEST,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('lambdas/uploadToDynamoDB'),
            role: fileTableInputRole,
            environment: {
                ddbTable: fileTable.tableName
            }
        });

        createFileMetaLambda.node.addDependency(fileTable, fileTableInputRole);

        // Create a API Gateway
        // [TODO] May add cors later
        const fileInputIntegration = new HttpLambdaIntegration('fileInputIntegration', createFileMetaLambda);

        const api = new apigateway.HttpApi(this, 'FileApi', {
            apiName: 'fileApi',
            description: 'This service creates a new item of text input and file input path in dynamoDB',
        });

        api.addRoutes({
            path: '/fileInputData',
            methods: [apigateway.HttpMethod.POST],
            integration: fileInputIntegration
        });


        // Create a role for ec2 instance to access fileBucket
        const fileTableOutputRole = new iam.Role(this, 'FileOutputRole', {
            roleName: 'fileOutputRole',
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess'),
                iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2FullAccess'),
            ]
        });

        fileBucket.grantReadWrite(fileTableOutputRole);
        fileTable.grantReadWriteData(fileTableOutputRole);
        fileTableOutputRole.node.addDependency(fileTable, fileBucket);

        // Create a bucket to store scripts for ec2 instance
        const scriptBucket = new s3.Bucket(this, 'ScriptBucket', {
            versioned: true,
            bucketName: 'ywt-script-bucket',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            encryption: s3.BucketEncryption.S3_MANAGED,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
        });

        // Create a object deployment of scripts
        const deployment = new s3deploy.BucketDeployment(this, 'DeployScripts', {
            sources: [s3deploy.Source.asset('./scripts')],
            destinationBucket: scriptBucket,
        });

        deployment.node.addDependency(scriptBucket);
        scriptBucket.grantRead(fileTableOutputRole);

        // Create a launch template for ec2 instance
        const defaultSG = new ec2.SecurityGroup(this, 'DefaultSG', {
            vpc: ec2.Vpc.fromLookup(this, 'VPC', { isDefault: true }),
            securityGroupName: 'defaultSG',
            allowAllOutbound: true,
        });

        const defaultKP = new ec2.KeyPair(this, 'DefaultKP', {
            keyPairName: 'defaultKP',
            type: ec2.KeyPairType.RSA
        });

        const launchTemplate = new ec2.LaunchTemplate(this, 'LaunchTemplate', {
            machineImage: ec2.MachineImage.latestAmazonLinux2023(),
            securityGroup: defaultSG,
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
            launchTemplateName: 'launchTemplate',
            role: fileTableOutputRole,
            keyPair: defaultKP,
            instanceInitiatedShutdownBehavior: ec2.InstanceInitiatedShutdownBehavior.TERMINATE
        });

        launchTemplate.node.addDependency(scriptBucket, defaultSG);

        // Create a role for Lambda function to create ec2 instance
        const ec2CreationRole = new iam.Role(this, 'Ec2CreationRole', {
            roleName: 'ec2CreationRole',
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess'),
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
                iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2FullAccess')
            ]
        });

        fileTableOutputRole.grantPassRole(ec2CreationRole);
        fileTable.grantStreamRead(ec2CreationRole);

        // Create a Lambda function to create ec2 append input text to file, send updated file to S3, and update output file path to dynamoDB
        const ec2CreationLambda = new lambda.Function(this, 'Ec2CreationLambda', {
            functionName: 'ec2CreationLambda',
            runtime: lambda.Runtime.NODEJS_LATEST,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('lambdas/appendInput'),
            role: ec2CreationRole,
            environment: {
                TABLE_NAME: 'fileTable',
                SCRIPT_PATH: scriptBucket.s3UrlForObject('ec2.sh'),
                LAUNCH_TEMPLATE_ID: launchTemplate.launchTemplateId || '',
            }
        });

        ec2CreationLambda.addEventSource(new eventsources.DynamoEventSource(fileTable, {
            startingPosition: lambda.StartingPosition.LATEST,
            filters: [lambda.FilterCriteria.filter({ eventName: lambda.FilterRule.isEqual('INSERT') })],
            batchSize: 1
        }))
        ec2CreationLambda.node.addDependency(fileTable, ec2CreationRole, launchTemplate);
    }
}