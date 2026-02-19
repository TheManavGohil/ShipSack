import dotenv from 'dotenv'
dotenv.config()

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const dynamoDBClient = new DynamoDBClient({
    region: process.env.AWS_REGION!
})

const ddb = DynamoDBDocumentClient.from(dynamoDBClient)

export async function updateStatus(id: string, status: string){
    await ddb.send(
        new UpdateCommand({
            TableName: process.env.DYNAMO_TABLE_NAME!,
            Key: { id },
            UpdateExpression: "SET #s = :status",
            ExpressionAttributeNames: {
                "#s": "status"
            },
            ExpressionAttributeValues: {
                ":status": status
            }
        })
    )

}