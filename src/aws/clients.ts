import { S3Client } from "@aws-sdk/client-s3";
import { SQSClient } from "@aws-sdk/client-sqs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { env } from "../env.js";

const credentials =
  env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
    ? { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY }
    : undefined;

export const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials,
});

export const sqsClient = new SQSClient({
  region: env.AWS_REGION,
  credentials,
});

export const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: env.AWS_REGION,
    credentials,
  })
);

