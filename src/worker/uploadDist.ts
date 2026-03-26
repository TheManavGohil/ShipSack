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
  const repoPath = path.join(repoRootDir, "output", id);
  const distPath = path.join(repoPath, "dist");

  const folderToUpload = fs.existsSync(distPath) ? distPath : repoPath;
  const allFiles = getAllFiles(folderToUpload);

  for (const file of allFiles) {
    const relativePath = path.relative(folderToUpload, file).replaceAll(/\\/g, "/");
    const key = `dist/${id}/${relativePath}`;
    await uploadFileToS3(key, file);
  }
}

