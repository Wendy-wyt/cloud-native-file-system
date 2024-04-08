import { RunInstancesCommand } from "@aws-sdk/client-ec2";
import { EC2Client } from "@aws-sdk/client-ec2";

const REGION = "us-east-1";
const client = new EC2Client({ region: REGION });

// env: TABLE_NAME, SCRIPT_PATH, LAUNCH_TEMPLATE_ID
export const handler = async (event) => {
    let body;
    let statusCode = 200;
    const id = event.Records[0].dynamodb.NewImage.id.S;
    if (!id) {
        statusCode = 400;
        body = JSON.stringify("No item id");
    }

    const tableName = process.env.TABLE_NAME;
    const scriptPath = process.env.SCRIPT_PATH;
    const launchTemplateId = process.env.LAUNCH_TEMPLATE_ID;
    try {
        await ec2(launchTemplateId, scriptPath, tableName, id);
        body = 'created ec2';
        statusCode = 200;
    } catch (err) {
        body = JSON.stringify(err.message);
        statusCode = 500;
    }

    const response = {
        statusCode: statusCode,
        body: body,
    };

    return response;
};

const ec2 = async (launchTemplateId, scriptPath, tableName, id) => {
    const userData = Buffer.from(
        `#!/bin/bash
        cd /home/ec2-user
        aws s3 cp ${scriptPath} script.sh
        sudo chmod +x script.sh
        ./script.sh ${tableName} ${id}`
    ).toString('base64');

    const command = new RunInstancesCommand({
        LaunchTemplate: {
            LaunchTemplateId: launchTemplateId,
            Version: "$Latest",
        },
        // Add user data to the instance to run commands when the instance starts.
        UserData: userData,
        // Ensure only 1 instance launches.
        MinCount: 1,
        MaxCount: 1,
    });

    await client.send(command);
};