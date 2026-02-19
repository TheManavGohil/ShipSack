import dotenv from "dotenv"
dotenv.config()

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import path from "path"
import fs, { existsSync } from "fs"

const __dirname = import.meta.dirname;

const s3Client = new S3Client({
    region: process.env.AWS_REGION!
})

export async function copyFinalDist(id: string){
    const repoPath = path.join(__dirname,"output",id)
    const folderPath = path.join(repoPath, "dist")

    let folderToUpload : string;

    if(existsSync(folderPath)){
        console.log("dist folder found for repo : ", id)
        folderToUpload = folderPath
    }else{
        console.log(`dist folder not found for repo : ${id}, soo treating the whole repo as static files and uploading to s3`)
        folderToUpload = repoPath
    }

    const allFiles = getAllFiles(folderToUpload)

    for(const file of allFiles){
        const relativePath = path.relative(folderToUpload,file).replaceAll(/\\/g,"/")

        const key = `dist/${id}/${relativePath}`

        await uploadFileToS3(key, file)
    }
    
    console.log("all files uploaded to s3 for repo : ", id)
}


function getAllFiles(folderPath : string ) :string[] {  
    // current folderPath = D:\desktop\code-along\dist\output\jhsq1\dist
    let result: string[] = [];

    const AllFilesandFolders = fs.readdirSync(folderPath);
    AllFilesandFolders.forEach(file => {
        const fullFilePath = path.join(folderPath, file);

        if(fs.statSync(fullFilePath).isDirectory()){
            if(file === ".git") return;  // skip .git folder if exists
            result = result.concat(getAllFiles(fullFilePath));
        }else{
            result.push(fullFilePath)
        }
    })
    return result;
}

async function uploadFileToS3(key: string, localFilePath: string){
    const fileStream = fs.createReadStream(localFilePath)

    await s3Client.send(
        new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME!,
            Key: key,
            Body: fileStream
        })
    ) 

    console.log("uploaded dist file to s3 : ", key)
}

