import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { Readable } from 'stream'
import mime from 'mime-types'

const app = express()

const s3Client = new S3Client({
    region: process.env.AWS_REGION!,
    credentials:{
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    }
})


// app.get('/:path(.*)', (req,res)=>{
// app.get('*', (req,res)=>{            // both stop working from express 5
app.use(async (req,res,next)=>{
    const host = req.hostname
    console.log(host)   //id.djscodeai.in
    const id = host.split('.')[0]
    console.log(id)     // (id,djscodeai,in)
    let filePath = req.path 
    console.log(filePath)  // /index.html

    if(filePath === '/'){
        filePath = '/index.html'
    }

    filePath = filePath.slice(1)  // remove leading slash

    const key = `dist/${id}/${filePath}`

    const contents = await s3Client.send(
        new GetObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME!,
            Key: key
        })
    )   

    console.log("S3 working perfectly fine!")  // { Body: ReadableStream, ... }

    const stream = contents.Body as Readable
    // console.log(stream)  // ReadableStream { ... }

    const type = mime.lookup(filePath) || "application/octet-stream"

    res.set('Content-Type', type)
    stream.pipe(res)
})

app.listen(3001, () =>{
    console.log('Server is running on port 3001')
})