import express from "express";
import cors from "cors";
import { generate } from "./randomIDgeneration.js"
import { simpleGit } from "simple-git";
import path from "path";
import { getAllFiles } from "./getAllFiles.js";
import { uploadFile } from "./aws.js";
import { sqsClient, ddb } from "./queue.js";
import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { SendMessageCommand } from "@aws-sdk/client-sqs";

import dotenv from "dotenv";
dotenv.config();

if(!process.env.SQS_QUEUE_URL || !process.env.DYNAMO_TABLE_NAME) {
    throw new Error("One or more AWS environment variables are not defined in .env");
}

const __dirname = import.meta.dirname;  // Get the current working directory, it works only for commonJS modules, for ES modules we need to use import.meta.dirname

console.log(path.join(__dirname, "output"))

const app = express();
const git = simpleGit();

app.use(cors())
app.use(express.json());

app.post('/deploy', async (req,res)=>{
    const repoURL = req.body.repoURL;
    const id = generate();
    await git.clone(repoURL, path.join(__dirname,`output/${id}`))
    const files = await getAllFiles(path.join(__dirname,`output/${id}`))
    // console.log(files)
    for(const file of files){
        await uploadFile(file.slice(__dirname.length+1),file)
    }

    console.log("using table", process.env.DYNAMO_TABLE_NAME);
    await ddb.send(
        new PutCommand({
            TableName : process.env.DYNAMO_TABLE_NAME,
            Item:{
                id: id,
                status: "uploaded",
                createdAt : Date.now(),
            },
        })
    )

    await sqsClient.send(
        new SendMessageCommand({
            QueueUrl: process.env.SQS_QUEUE_URL,
            MessageBody: JSON.stringify({ id }),

            MessageGroupId : "vercel-deployment-group", // for FIFO queue, all messages with same group id will be processed in order---suppose i want 2 different group of messages to be processed in order but independently then i can give them different group id
        })
    )

    res.json({"message":`recieved repo URL${repoURL} and queued for deployment with id ${id}`}) 
})

app.get('/status/:id', async (req,res)=>{
    const id = req.params.id as string;
    if(!id){
        return res.status(400).json({"message" : "id is missing"})
    }
    const result = await ddb.send(
        new GetCommand({
            TableName : process.env.DYNAMO_TABLE_NAME,
            Key : { id },
        })
    )
    res.json({"status": result.Item?.status || "not found"})
})


app.listen(3000, () =>{
    console.log("server is listening")
});