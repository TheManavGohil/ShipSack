import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { sqsClient } from "./clients.js";
import { env } from "../env.js";

export async function enqueueBuildJob(id: string, repoURL: string) {
  await sqsClient.send(
    new SendMessageCommand({
      QueueUrl: env.SQS_QUEUE_URL,
      MessageBody: JSON.stringify({ id, repoURL }),
      MessageGroupId: "vercel-deployment-group",
    })
  );
}

