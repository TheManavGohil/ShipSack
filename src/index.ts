import express from "express";
import cors from "cors";
import path from "path";
import { GetCommand } from "@aws-sdk/lib-dynamodb";

import { env } from "./env.js";
import { ddb } from "./aws/clients.js";
import { generateId } from "./utils/generateId.js";
import { createDeploymentStatus } from "./aws/status.js";
import { enqueueBuildJob } from "./aws/queue.js";
import { startWorkerLoop } from "./worker/workerLoop.js";
import { staticFromS3BySubdomain } from "./http/staticFromS3.js";

const __dirname = import.meta.dirname;
const repoRootDir = path.join(__dirname, ".."); // code-along-server/
const workRootDir = repoRootDir; // keep runtime working dir stable

const app = express();

app.use(cors());
app.use(express.json());

app.post("/deploy", async (req, res) => {
  const repoURL = req.body?.repoURL as string | undefined;
  if (!repoURL) return res.status(400).json({ message: "repoURL is required" });

  const id = generateId();
  await createDeploymentStatus(id, "uploaded");
  await enqueueBuildJob(id, repoURL);

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

