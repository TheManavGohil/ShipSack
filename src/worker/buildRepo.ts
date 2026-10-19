import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export function buildRepoLocally(repoDir: string, outDir: string) {
  return new Promise<boolean>((resolve, reject) => {
    const packagePath = path.join(repoDir, "package.json");

    if (!fs.existsSync(packagePath)) {
      resolve(true);
      return;
    }

    const spawnOptions = {
      cwd: repoDir,
      stdio: "inherit" as const,
      shell: true,
    };

    const install = spawn("npm", ["install"], spawnOptions);
    install.on("close", (code: number | null) => {
      if (code !== 0) return reject(new Error("npm install failed"));

      const build = spawn("npm", ["run", "build"], spawnOptions);
      build.on("close", (buildCode: number | null) => {
        if (buildCode !== 0) return reject(new Error("npm run build failed"));
        const repoDist = path.join(repoDir, "dist");
        if (fs.existsSync(repoDist)) {
          fs.mkdirSync(path.join(outDir, "dist"), { recursive: true });
          fs.cpSync(repoDist, path.join(outDir, "dist"), { recursive: true });
        }
        resolve(true);
      });
    });
  });
}

