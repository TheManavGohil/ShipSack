import dotenv from 'dotenv';
dotenv.config();

import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { downloadFromS3 } from './aws.js';
import { buildRepo } from './built.js';

if(!process.env.AWS_REGION || !process.env.SQS_QUEUE_URL){
    console.error('environment variable is not set.');
}

const sqsClient = new SQSClient({
    region: process.env.AWS_REGION!
})

async function pollfromSQS(){
    console.log("worker startedd....")

    while(true){
        const response = await sqsClient.send(
            new ReceiveMessageCommand({
                QueueUrl : process.env.SQS_QUEUE_URL,
                MaxNumberOfMessages: 1,
                WaitTimeSeconds: 20,
                VisibilityTimeout: 60*10 
            })
        )

        if(!response.Messages || response.Messages.length === 0){
            continue;      //nothing recieved ---loop again
        }

        for(const message of response.Messages){
            console.log("recieved raw message : ", message.Body)

            const parsed = JSON.parse(message.Body || '{}')
            console.log("recieved job id: ",parsed.id)

            await downloadFromS3(`output/${parsed.id}`)

            await buildRepo(parsed.id)

            //delete the message from the queue
            await sqsClient.send(
                new DeleteMessageCommand({
                    QueueUrl: process.env.SQS_QUEUE_URL,
                    ReceiptHandle: message.ReceiptHandle!
                })
            )
        }

    }
}

pollfromSQS()