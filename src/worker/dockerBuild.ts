import { spawn } from "child_process";
import fs from "fs";
import path from "path";

function run(cmd: string, args: string[], opts: { cwd: string }) {
  return new Promise<void>((resolve, reject) => {
    const p = spawn(cmd, args, { cwd: opts.cwd, stdio: "inherit", shell: true });
    p.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} failed with code ${code}`));
    });
  });
}

/**
 * Builds the repo inside Docker and exports the resulting /app/dist locally.
 * Requires Docker + BuildKit (for `--output type=local`).
 */
export async function dockerBuildAndExportDist(params: {
  repoDir: string;
  outDir: string;
  imageTag: string;
}) {
  const dockerfilePath = path.join(params.repoDir, ".vercelclone.build.Dockerfile");
  const dockerfile = [
    "FROM node:20-alpine AS build",
    "WORKDIR /app",
    "COPY . .",
    "RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi",
    "RUN npm run build",
    "",
    "FROM scratch AS export",
    "COPY --from=build /app/dist /dist",
    "",
  ].join("\n");

  fs.writeFileSync(dockerfilePath, dockerfile, "utf8");

  try {
    fs.mkdirSync(params.outDir, { recursive: true });

    await run(
      "docker",
      [
        "build",
        "--progress=plain",
        "-f",
        dockerfilePath,
        "-t",
        params.imageTag,
        "--output",
        `type=local,dest=${params.outDir}`,
        ".",
      ],
      { cwd: params.repoDir }
    );
  } finally {
    try {
      fs.unlinkSync(dockerfilePath);
    } catch {
      // ignore
    }
  }
}

export async function dockerRemoveImage(imageTag: string) {
  try {
    await run("docker", ["rmi", "-f", imageTag], { cwd: process.cwd() });
  } catch {
    // ignore cleanup errors
  }
}

