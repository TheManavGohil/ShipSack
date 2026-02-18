import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import fs from 'fs'
import path from 'path'
import { pipeline } from "stream/promises";

import dotenv from 'dotenv';
dotenv.config();

const s3Client = new S3Client({
    region: process.env.AWS_REGION!
})

const __dirname = import.meta.dirname;

export async function downloadFromS3(prefix: string){
    console.log("downloading folder from s3 : ", prefix)

    const response = await s3Client.send(
        new ListObjectsV2Command({
            Bucket: process.env.AWS_BUCKET_NAME!,
            Prefix: prefix,
        })
    )

    const objects = response.Contents

    if(!objects || objects.length ===0){
        console.error("no objects found in s3 with prefix : ", prefix)
        return;
    }

    for(const object of objects){
        const localFilePath = path.join(__dirname,object.Key!)

        fs.mkdirSync(path.dirname(localFilePath), { recursive : true })

        const getObjectResponses = await s3Client.send(
            new GetObjectCommand({
                Bucket : process.env.AWS_BUCKET_NAME!,
                Key : object.Key!
            })
        )

        const bodyStream = getObjectResponses.Body as ReadableStream

        await pipeline(bodyStream, fs.createWriteStream(localFilePath))

        console.log("downloaded file from s3 : ", localFilePath)
    }
    console.log("all files downloaded from s3 for prefix : ", prefix)
}

// downloadFromS3("output/j9bks")