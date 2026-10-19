import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { GetCommand } from "@aws-sdk/lib-dynamodb";

import { env } from "./env.js";
import { ddb } from "./aws/clients.js";
import { generateId } from "./utils/generateId.js";
import { createDeploymentStatus, getDeploymentStatus } from "./aws/status.js";
import { enqueueBuildJob } from "./aws/queue.js";
import { startWorkerLoop } from "./worker/workerLoop.js";
import { staticFromS3BySubdomain } from "./http/staticFromS3.js";
import mime from "mime-types";

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

  const status = await getDeploymentStatus(id);
  res.json({ status });
});

// Optional direct path preview: /preview/:id/*
app.use("/preview/:id", (req, res, next) => {
  const id = req.params.id;
  let filePath = req.path;
  if (filePath === "/" || filePath === "") filePath = "/index.html";
  const cleanPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
  const localFilePath = path.join(process.cwd(), "dist-sites", id, cleanPath);
  if (fs.existsSync(localFilePath) && fs.statSync(localFilePath).isFile()) {
    const type = mime.lookup(filePath) || "application/octet-stream";
    res.set("Content-Type", String(type));
    return fs.createReadStream(localFilePath).pipe(res);
  }
  next();
});

// Serve deployed assets (subdomain-based) after API routes
app.use(staticFromS3BySubdomain);

// Serve frontend static assets on main domain (localhost:3000)
const frontendDist = path.join(repoRootDir, "frontend", "dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.method !== "GET") return next();
    const host = req.hostname;
    if (host.includes(".localhost")) {
      return next();
    }
    const indexHtml = path.join(frontendDist, "index.html");
    if (fs.existsSync(indexHtml)) {
      return res.sendFile(indexHtml);
    }
    next();
  });
}

app.listen(env.PORT, () => {
  console.log(`server listening on ${env.PORT}`);
});

// Start worker loop in the same process
startWorkerLoop(repoRootDir).catch((err) => {
  console.error("[worker] fatal:", err);
});

