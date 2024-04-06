import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});

const dynamo = DynamoDBDocumentClient.from(client);

const tableName = process.env.ddbTable;

export const handler = async (event) => {
  let body;
  let statusCode = 200;
  const headers = {
    "Content-Type": "application/json",
  };

  try {
    switch (event.routeKey) {
      case "POST /fileInputData":
        if (event.body) {
          const file = JSON.parse(event.body);
          body = await dynamo.send(
            new PutCommand({
              TableName: tableName,
              Item: {
                id: file.id,
                input_text: file.input_text,
                input_file_path: file.input_file_path,
              },
            })
          );
        } else {
          throw new Error("Invalid input. Please provide file object.");
        }
        break;
      default:
        throw new Error(`Unsupported route: "${event.routeKey}"`);
    }
  } catch (err) {
    statusCode = 400;
    body = err.message;
  } finally {
    body = JSON.stringify(body);
  }

  return {
    statusCode,
    body,
    headers,
  };
};
