import { SQSClient } from "@aws-sdk/client-sqs"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb"

import dotenv from "dotenv";

dotenv.config();
if(!process.env.AWS_REGION) {
    throw new Error("One or more AWS environment variables are not defined in .env");
}

export const sqsClient = new SQSClient({
    region: process.env.AWS_REGION,
})

export const dynamoDBClient = new DynamoDBClient({
    region: process.env.AWS_REGION,
})

export const ddb = DynamoDBDocumentClient.from(dynamoDBClient)