import dotenv from "dotenv";

dotenv.config();

export type Env = {
  PORT: number;
  AWS_REGION: string;
  AWS_BUCKET_NAME: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  SQS_QUEUE_URL: string;
  DYNAMO_TABLE_NAME: string;
};

function required(name: keyof Env): string {
  const v = process.env[name as string];
  if (!v) throw new Error(`Missing required env var: ${String(name)}`);
  return v;
}

export const env: Env = {
  PORT: Number(process.env.PORT ?? "3000"),
  AWS_REGION: required("AWS_REGION"),
  AWS_BUCKET_NAME: required("AWS_BUCKET_NAME"),
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  SQS_QUEUE_URL: required("SQS_QUEUE_URL"),
  DYNAMO_TABLE_NAME: required("DYNAMO_TABLE_NAME"),
};

