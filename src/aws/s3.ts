import { GetObjectCommand, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";
import { pipeline } from "stream/promises";
import fs from "fs";
import path from "path";
import { s3Client } from "./clients.js";
import { env } from "../env.js";

export async function uploadFileToS3(key: string, localFilePath: string) {
  const fileStream = fs.createReadStream(localFilePath);
  await s3Client.send(
    new PutObjectCommand({
      Bucket: env.AWS_BUCKET_NAME,
      Key: key.replace(/\\/g, "/"),
      Body: fileStream,
    })
  );
}

export async function downloadPrefixFromS3(prefix: string, localRootDir: string) {
  const response = await s3Client.send(
    new ListObjectsV2Command({
      Bucket: env.AWS_BUCKET_NAME,
      Prefix: prefix,
    })
  );

  const objects = response.Contents ?? [];
  if (objects.length === 0) return;

  for (const object of objects) {
    if (!object.Key) continue;
    const localFilePath = path.join(localRootDir, object.Key);
    fs.mkdirSync(path.dirname(localFilePath), { recursive: true });

    const getResp = await s3Client.send(
      new GetObjectCommand({
        Bucket: env.AWS_BUCKET_NAME,
        Key: object.Key,
      })
    );

    if (!getResp.Body) continue;
    await pipeline(getResp.Body as unknown as NodeJS.ReadableStream, fs.createWriteStream(localFilePath));
  }
}

