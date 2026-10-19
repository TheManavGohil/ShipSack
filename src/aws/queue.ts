import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { sqsClient } from "./clients.js";
import { env } from "../env.js";

export type BuildJob = { id: string; repoURL: string };
export const localQueue: BuildJob[] = [];

export async function enqueueBuildJob(id: string, repoURL: string) {
  try {
    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: env.SQS_QUEUE_URL,
        MessageBody: JSON.stringify({ id, repoURL }),
        MessageGroupId: "vercel-deployment-group",
        MessageDeduplicationId: `${id}-${Date.now()}`,
      })
    );
    console.log(`[sqs] Enqueued build job ${id} to ${env.SQS_QUEUE_URL}`);
  } catch (err) {
    console.warn(`[sqs] SendMessage failed, using local queue:`, (err as Error).message);
    localQueue.push({ id, repoURL });
  }
}

