import { DeleteMessageCommand, ReceiveMessageCommand } from "@aws-sdk/client-sqs";
import path from "path";
import fs from "fs";
import { simpleGit } from "simple-git";
import { sqsClient } from "../aws/clients.js";
import { env } from "../env.js";
import { updateDeploymentStatus } from "../aws/status.js";
import { uploadFinalOutput } from "./uploadDist.js";
import { dockerBuildAndExportDist, dockerRemoveImage } from "./dockerBuild.js";

export async function startWorkerLoop(repoRootDir: string) {
  console.log("[worker] starting SQS poll loop");
  const git = simpleGit();

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
        const parsed = JSON.parse(body) as { id?: string; repoURL?: string };
        const id = parsed.id;
        const repoURL = parsed.repoURL;
        if (!id || !repoURL) continue;

        const jobDir = path.join(repoRootDir, "jobs", id);
        const repoDir = path.join(jobDir, "repo");
        const exportDir = path.join(jobDir, "export");
        const imageTag = `vercelclone-build:${id}`;

        fs.mkdirSync(jobDir, { recursive: true });

        await updateDeploymentStatus(id, "cloning");
        await git.clone(repoURL, repoDir);

        await updateDeploymentStatus(id, "building");
        const packageJsonPath = path.join(repoDir, "package.json");
        if (fs.existsSync(packageJsonPath)) {
          await dockerBuildAndExportDist({ repoDir, outDir: exportDir, imageTag });
        }

        await updateDeploymentStatus(id, "deploying");
        await uploadFinalOutput(repoRootDir, id);

        await updateDeploymentStatus(id, "deployed");

        await dockerRemoveImage(imageTag);
        try {
          fs.rmSync(jobDir, { recursive: true, force: true });
        } catch {
          // ignore
        }

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

