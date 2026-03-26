import { PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "./clients.js";
import { env } from "../env.js";

export async function createDeploymentStatus(id: string, status: string) {
  await ddb.send(
    new PutCommand({
      TableName: env.DYNAMO_TABLE_NAME,
      Item: {
        id,
        status,
        createdAt: Date.now(),
      },
    })
  );
}

export async function updateDeploymentStatus(id: string, status: string) {
  await ddb.send(
    new UpdateCommand({
      TableName: env.DYNAMO_TABLE_NAME,
      Key: { id },
      UpdateExpression: "SET #s = :status",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: { ":status": status },
    })
  );
}

