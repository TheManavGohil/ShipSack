import type { Request, Response, NextFunction } from "express";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import mime from "mime-types";
import { s3Client } from "../aws/clients.js";
import { env } from "../env.js";

import fs from "fs";
import path from "path";

export async function staticFromS3BySubdomain(req: Request, res: Response, next: NextFunction) {
  try {
    const host = req.hostname; // e.g. id.localhost, id.shipsack.com, or id.13.232.50.12.sslip.io
    if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") return next();
    // Raw IPv4 addresses (e.g. 13.232.50.12) are not subdomains
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return next();

    const parts = host.split(".");
    if (parts.length < 2) return next();
    const id = parts[0];
    if (!id || id === "localhost" || id === "www") return next();

    let filePath = req.path;
    if (filePath === "/") filePath = "/index.html";
    const cleanPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
    const key = `dist/${id}/${cleanPath}`;

    // 1. Try S3
    try {
      const obj = await s3Client.send(
        new GetObjectCommand({
          Bucket: env.AWS_BUCKET_NAME,
          Key: key,
        })
      );

      if (obj.Body) {
        console.log(`[s3-serve] Serving ${key} from S3 bucket ${env.AWS_BUCKET_NAME}`);
        const type = mime.lookup(filePath) || "application/octet-stream";
        res.set("Content-Type", String(type));
        return (obj.Body as unknown as NodeJS.ReadableStream).pipe(res);
      }
    } catch (s3Err) {
      console.warn(`[s3-serve] S3 fetch failed for ${key}:`, (s3Err as Error).message);
    }

    // 2. Fallback to local dist-sites mirror
    const localFilePath = path.join(process.cwd(), "dist-sites", id, cleanPath);
    if (fs.existsSync(localFilePath) && fs.statSync(localFilePath).isFile()) {
      const type = mime.lookup(filePath) || "application/octet-stream";
      res.set("Content-Type", String(type));
      return fs.createReadStream(localFilePath).pipe(res);
    }

    next();
  } catch {
    next();
  }
}

