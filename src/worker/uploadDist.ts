import path from "path";
import fs from "fs";
import { uploadFileToS3 } from "../aws/s3.js";

function getAllFiles(folderPath: string): string[] {
  let result: string[] = [];
  const entries = fs.readdirSync(folderPath);
  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (entry === ".git") continue;
      result = result.concat(getAllFiles(fullPath));
    } else {
      result.push(fullPath);
    }
  }
  return result;
}

export async function uploadFinalOutput(repoRootDir: string, id: string) {
  const distPath = path.join(repoRootDir, "jobs", id, "export", "dist");
  const staticPath = path.join(repoRootDir, "jobs", id, "repo");

  // Mirror full repo to output-sites/<id>/ and upload to S3 output/<id>/
  const repoDir = path.join(repoRootDir, "jobs", id, "repo");
  if (fs.existsSync(repoDir)) {
    const localOutputTarget = path.join(repoRootDir, "output-sites", id);
    fs.mkdirSync(localOutputTarget, { recursive: true });
    const repoFiles = getAllFiles(repoDir);
    for (const file of repoFiles) {
      const relativePath = path.relative(repoDir, file).replaceAll(/\\/g, "/");
      const targetLocal = path.join(localOutputTarget, relativePath);
      fs.mkdirSync(path.dirname(targetLocal), { recursive: true });
      fs.copyFileSync(file, targetLocal);

      const key = `output/${id}/${relativePath}`;
      try {
        await uploadFileToS3(key, file);
      } catch (e) {
        console.warn(`[s3] S3 upload error for ${key}:`, (e as Error).message);
      }
    }
    console.log(`[s3] Uploaded source repo files to S3 prefix output/${id}/`);
  }

  // Mirror build output to dist-sites/<id>/ and upload to S3 dist/<id>/
  const folderToUpload = fs.existsSync(distPath) ? distPath : staticPath;
  const localDistTarget = path.join(repoRootDir, "dist-sites", id);
  fs.mkdirSync(localDistTarget, { recursive: true });

  const allFiles = getAllFiles(folderToUpload);

  for (const file of allFiles) {
    const relativePath = path.relative(folderToUpload, file).replaceAll(/\\/g, "/");
    const targetLocal = path.join(localDistTarget, relativePath);
    fs.mkdirSync(path.dirname(targetLocal), { recursive: true });
    fs.copyFileSync(file, targetLocal);

    const key = `dist/${id}/${relativePath}`;
    try {
      await uploadFileToS3(key, file);
    } catch (e) {
      console.warn(`[s3] S3 upload error for ${key}:`, (e as Error).message);
    }
  }
  console.log(`[s3] Uploaded ${allFiles.length} files to S3 prefix dist/${id}/`);
}

