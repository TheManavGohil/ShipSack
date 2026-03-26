import fs from "fs";
import path from "path";

export function getAllFiles(folderPath: string): string[] {
  let result: string[] = [];

  const entries = fs.readdirSync(folderPath);
  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === ".git") continue;
      result = result.concat(getAllFiles(fullPath));
    } else {
      result.push(fullPath);
    }
  }

  return result;
}

