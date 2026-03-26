import type { Request, Response, NextFunction } from "express";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import mime from "mime-types";
import { s3Client } from "../aws/clients.js";
import { env } from "../env.js";

export async function staticFromS3BySubdomain(req: Request, res: Response, next: NextFunction) {
  try {
    const host = req.hostname; // e.g. id.localhost
    const id = host.split(".")[0];
    if (!id || id === "localhost") return next();

    let filePath = req.path;
    if (filePath === "/") filePath = "/index.html";
    const key = `dist/${id}/${filePath.slice(1)}`;

    const obj = await s3Client.send(
      new GetObjectCommand({
        Bucket: env.AWS_BUCKET_NAME,
        Key: key,
      })
    );

    if (!obj.Body) return next();

    const type = mime.lookup(filePath) || "application/octet-stream";
    res.set("Content-Type", String(type));
    (obj.Body as unknown as NodeJS.ReadableStream).pipe(res);
  } catch {
    next();
  }
}

