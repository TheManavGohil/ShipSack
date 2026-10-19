import { DeleteMessageCommand, ReceiveMessageCommand } from "@aws-sdk/client-sqs";
import path from "path";
import fs from "fs";
import { simpleGit } from "simple-git";
import { sqsClient } from "../aws/clients.js";
import { env } from "../env.js";
import { updateDeploymentStatus } from "../aws/status.js";
import { localQueue } from "../aws/queue.js";
import { uploadFinalOutput } from "./uploadDist.js";
import { dockerBuildAndExportDist, dockerRemoveImage } from "./dockerBuild.js";
import { buildRepoLocally } from "./buildRepo.js";

export async function processJob(repoRootDir: string, id: string, repoURL: string) {
  console.log(`[worker] starting job ${id} for ${repoURL}`);
  const git = simpleGit();
  const jobDir = path.join(repoRootDir, "jobs", id);
  const repoDir = path.join(jobDir, "repo");
  const exportDir = path.join(jobDir, "export");
  const imageTag = `vercelclone-build:${id}`;

  try {
    fs.mkdirSync(jobDir, { recursive: true });

    await updateDeploymentStatus(id, "cloning");
    await git.clone(repoURL, repoDir);

    await updateDeploymentStatus(id, "building");
    const packageJsonPath = path.join(repoDir, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      try {
        await dockerBuildAndExportDist({ repoDir, outDir: exportDir, imageTag });
      } catch (dockerErr) {
        console.warn(`[docker] Docker build failed, falling back to local build:`, (dockerErr as Error).message);
        try {
          await buildRepoLocally(repoDir, exportDir);
        } catch (localErr) {
          console.error(`[build] Local build error:`, localErr);
          throw localErr;
        }
      }
    }

    await updateDeploymentStatus(id, "deploying");
    await uploadFinalOutput(repoRootDir, id);

    await updateDeploymentStatus(id, "deployed");
    console.log(`[worker] Successfully deployed job ${id}`);
  } catch (err) {
    console.error(`[worker] Job ${id} failed:`, err);
    await updateDeploymentStatus(id, "failed");
  } finally {
    await dockerRemoveImage(imageTag);
    try {
      fs.rmSync(jobDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

export async function startWorkerLoop(repoRootDir: string) {
  console.log("[worker] starting SQS worker poll loop");

  while (true) {
    // 1. Process any locally queued jobs first
    while (localQueue.length > 0) {
      const job = localQueue.shift();
      if (job) {
        try {
          await processJob(repoRootDir, job.id, job.repoURL);
        } catch (err) {
          console.error(`[worker] error processing local job ${job.id}:`, err);
        }
      }
    }

    // 2. Poll SQS for cloud jobs
    try {
      const resp = await sqsClient.send(
        new ReceiveMessageCommand({
          QueueUrl: env.SQS_QUEUE_URL,
          MaxNumberOfMessages: 1,
          WaitTimeSeconds: 10,
          VisibilityTimeout: 60 * 10,
        })
      );

      const messages = resp.Messages ?? [];
      for (const msg of messages) {
        const body = msg.Body ?? "{}";
        const parsed = JSON.parse(body) as { id?: string; repoURL?: string };
        const id = parsed.id;
        const repoURL = parsed.repoURL;
        if (!id || !repoURL) continue;

        console.log(`[sqs] Received SQS message for job ${id}`);
        await processJob(repoRootDir, id, repoURL);

        if (msg.ReceiptHandle) {
          await sqsClient.send(
            new DeleteMessageCommand({
              QueueUrl: env.SQS_QUEUE_URL,
              ReceiptHandle: msg.ReceiptHandle,
            })
          );
          console.log(`[sqs] Deleted message for job ${id} from queue`);
        }
      }
    } catch (err) {
      console.warn(`[sqs] Polling error:`, (err as Error).message);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

