import {
  S3Client,
  PutObjectCommand
} from "@aws-sdk/client-s3";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();  

// Validate env variables early to avoid ts error of undefined
if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_BUCKET_NAME) {
  throw new Error("One or more AWS environment variables are not defined in .env");
}

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
export const uploadFile = async ( fileName: string,localFilePath: string ) => {
  const fileContent = fs.createReadStream(localFilePath);

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileName.replace(/\\/g, "/"), //key is basically relative path to store this file 
                                       //  Windows fix(windows bydefault add \\ while s3 or nautrally we see / soo we convert from \\ to /)
    Body: fileContent,
  });

  const response = await s3.send(command);
  console.log("Uploaded:", fileName);

  return response;
};