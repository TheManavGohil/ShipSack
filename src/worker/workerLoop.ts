import { DeleteMessageCommand, ReceiveMessageCommand } from "@aws-sdk/client-sqs";
import path from "path";
import { sqsClient } from "../aws/clients.js";
import { env } from "../env.js";
import { downloadPrefixFromS3 } from "../aws/s3.js";
import { updateDeploymentStatus } from "../aws/status.js";
import { buildRepo } from "./buildRepo.js";
import { uploadFinalOutput } from "./uploadDist.js";

export async function startWorkerLoop(repoRootDir: string) {
  console.log("[worker] starting SQS poll loop");

  while (true) {
    try {
      const resp = await sqsClient.send(
        new ReceiveMessageCommand({
          QueueUrl: env.SQS_QUEUE_URL,
          MaxNumberOfMessages: 1,
          WaitTimeSeconds: 20,
          VisibilityTimeout: 60 * 10,
        })
      );

      const messages = resp.Messages ?? [];
      if (messages.length === 0) continue;

      for (const msg of messages) {
        const body = msg.Body ?? "{}";
        const parsed = JSON.parse(body) as { id?: string };
        const id = parsed.id;
        if (!id) continue;

        await downloadPrefixFromS3(`output/${id}`, repoRootDir);

        await updateDeploymentStatus(id, "building");
        await buildRepo(repoRootDir, id);

        await updateDeploymentStatus(id, "deploying");
        await uploadFinalOutput(repoRootDir, id);

        await updateDeploymentStatus(id, "deployed");

        if (msg.ReceiptHandle) {
          await sqsClient.send(
            new DeleteMessageCommand({
              QueueUrl: env.SQS_QUEUE_URL,
              ReceiptHandle: msg.ReceiptHandle,
            })
          );
        }
      }
    } catch (err) {
      console.error("[worker] error processing SQS message:", err);
    }
  }
}

