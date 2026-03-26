import express from "express";
import cors from "cors";
import path from "path";
import { simpleGit } from "simple-git";
import { GetCommand } from "@aws-sdk/lib-dynamodb";

import { env } from "./env.js";
import { ddb } from "./aws/clients.js";
import { generateId } from "./utils/generateId.js";
import { getAllFiles } from "./utils/getAllFiles.js";
import { uploadFileToS3 } from "./aws/s3.js";
import { createDeploymentStatus, updateDeploymentStatus } from "./aws/status.js";
import { enqueueBuildJob } from "./aws/queue.js";
import { startWorkerLoop } from "./worker/workerLoop.js";
import { staticFromS3BySubdomain } from "./http/staticFromS3.js";

const __dirname = import.meta.dirname;
const repoRootDir = path.join(__dirname, ".."); // code-along-server/
const workRootDir = repoRootDir; // keep runtime working dir stable (output/ under repo root)

const app = express();
const git = simpleGit();

app.use(cors());
app.use(express.json());

app.post("/deploy", async (req, res) => {
  const repoURL = req.body?.repoURL as string | undefined;
  if (!repoURL) return res.status(400).json({ message: "repoURL is required" });

  const id = generateId();
  await createDeploymentStatus(id, "cloning");

  const outputDir = path.join(workRootDir, "output", id);
  await git.clone(repoURL, outputDir);

  const files = getAllFiles(outputDir);
  for (const file of files) {
    const relativeKey = file.slice(workRootDir.length + 1);
    await uploadFileToS3(relativeKey, file);
  }

  await updateDeploymentStatus(id, "uploaded");
  await enqueueBuildJob(id);

  res.json({ id });
});

app.get("/status/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ message: "id is missing" });

  const result = await ddb.send(
    new GetCommand({
      TableName: env.DYNAMO_TABLE_NAME,
      Key: { id },
    })
  );

  res.json({ status: (result.Item as { status?: string } | undefined)?.status ?? "not found" });
});

// Serve deployed assets (subdomain-based) after API routes
app.use(staticFromS3BySubdomain);

app.listen(env.PORT, () => {
  console.log(`server listening on ${env.PORT}`);
});

// Start worker loop in the same process
startWorkerLoop(repoRootDir).catch((err) => {
  console.error("[worker] fatal:", err);
});

