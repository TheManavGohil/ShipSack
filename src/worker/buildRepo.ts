import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export function buildRepo(repoRootDir: string, id: string) {
  return new Promise<boolean>((resolve, reject) => {
    const repoPath = path.join(repoRootDir, "output", id);
    const packagePath = path.join(repoPath, "package.json");

    if (!fs.existsSync(packagePath)) {
      resolve(true);
      return;
    }

    const spawnOptions = {
      cwd: repoPath,
      stdio: "inherit" as const,
      shell: true,
    };

    const install = spawn("npm", ["install"], spawnOptions);
    install.on("close", (code: number | null) => {
      if (code !== 0) return reject(new Error("npm install failed"));

      const build = spawn("npm", ["run", "build"], spawnOptions);
      build.on("close", (buildCode: number | null) => {
        if (buildCode !== 0) return reject(new Error("npm run build failed"));
        resolve(true);
      });
    });
  });
}

