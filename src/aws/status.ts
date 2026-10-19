import { PutCommand, UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "./clients.js";
import { env } from "../env.js";

const localStatusMap = new Map<string, string>();

export async function createDeploymentStatus(id: string, status: string) {
  localStatusMap.set(id, status);
  try {
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
    console.log(`[dynamodb] Created status '${status}' for ${id} in ${env.DYNAMO_TABLE_NAME}`);
  } catch (err) {
    console.warn(`[dynamodb] Put failed, using local status store:`, (err as Error).message);
  }
}

export async function updateDeploymentStatus(id: string, status: string) {
  localStatusMap.set(id, status);
  try {
    await ddb.send(
      new UpdateCommand({
        TableName: env.DYNAMO_TABLE_NAME,
        Key: { id },
        UpdateExpression: "SET #s = :status, #u = :updatedAt",
        ExpressionAttributeNames: { "#s": "status", "#u": "updatedAt" },
        ExpressionAttributeValues: { ":status": status, ":updatedAt": Date.now() },
      })
    );
    console.log(`[dynamodb] Updated status '${status}' for ${id} in ${env.DYNAMO_TABLE_NAME}`);
  } catch (err) {
    console.warn(`[dynamodb] Update failed, using local status store:`, (err as Error).message);
  }
}

export async function getDeploymentStatus(id: string): Promise<string> {
  try {
    const result = await ddb.send(
      new GetCommand({
        TableName: env.DYNAMO_TABLE_NAME,
        Key: { id },
      })
    );
    const s = (result.Item as { status?: string } | undefined)?.status;
    if (s) return s;
  } catch (err) {
    console.warn(`[dynamodb] Get failed for ${id}:`, (err as Error).message);
  }
  return localStatusMap.get(id) ?? "not found";
}

