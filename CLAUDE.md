# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a full-stack application consisting of:
- **Backend (`code-along-server`)**: Node.js/Express server that handles deployment requests, processes them via AWS services (SQS, DynamoDB, S3), and uses Docker to build client repositories.
- **Frontend (`code-along-frontend`)**: Vite + React + TypeScript application that interacts with the backend to trigger deployments and display status.

The backend worker loop polls an SQS queue for deployment jobs, clones the specified Git repository, builds it (if it contains a package.json), extracts the build output, and uploads both the repository and build artifacts to S3. The frontend can then serve these assets via subdomain-based routing.

## Development Commands

### Backend (`src/` directory)

- **Start development server**: `npm run dev`  
  Uses `tsx watch` to automatically restart the server on TypeScript changes.
- **Build for production**: `npm run build`  
  Compiles TypeScript to JavaScript in the `dist/` directory.
- **Start production server**: `npm run start`  
  Runs the compiled JavaScript from `dist/index.js`.
- **Linting**: No lint script configured for backend. Consider adding ESLint if needed.

### Frontend (`frontend/` directory)

- **Start development server**: `npm run dev`  
  Starts Vite dev server with hot module replacement.
- **Build for production**: `npm run build`  
  Compiles TypeScript and builds the React app via Vite.
- **Preview production build**: `npm run preview`  
  Locally previews the built application.
- **Linting**: `npm run lint`  
  Runs ESLint on TypeScript and React files.

### Common Notes

- Both backend and frontend use TypeScript. Ensure `tsconfig.json` is present in each respective directory.
- The backend relies on AWS services; see the "AWS Setup" section below.
- The frontend expects the backend to be running and accessible (default port 3000) for deployment API calls.

## Architecture Overview

### Backend Structure

- `src/index.ts`: Express application entry point. Defines routes:
  - `POST /deploy`: Accepts a repository URL, generates a deployment ID, stores initial status in DynamoDB, and enqueues a job to SQS.
  - `GET /status/:id`: Retrieves deployment status from DynamoDB.
  - `staticFromS3BySubdomain` middleware: Serves built assets from S3 based on subdomain (e.g., `id.localhost` serves from `dist/id/`).
- `src/worker/`: Contains the worker logic that processes deployment jobs.
  - `workerLoop.ts`: Main loop that polls SQS, processes messages, and orchestrates the deployment steps.
  - `buildRepo.ts`: Clones the Git repository and optionally runs `npm install` and `npm run build`.
  - `dockerBuild.ts`: Builds the repository inside Docker (if a package.json exists) and exports the `/app/dist` directory.
  - `uploadDist.ts`: Uploads both the repository and build output to S3 under specific prefixes (`output/{id}/` and `dist/{id}/`).
- `src/aws/`: AWS service clients and helpers.
  - `clients.ts`: Initializes S3, SQS, and DynamoDB clients.
  - `queue.ts`: Functions to enqueue deployment jobs to SQS.
  - `status.ts`: Functions to create and update deployment status in DynamoDB.
  - `s3.ts`: Helper to upload files to S3 (used by `uploadDist.ts`).
- `src/utils/`: Utility functions.
  - `generateId.ts`: Generates random alphanumeric IDs for deployments.
  - `getAllFiles.ts`: Recursively lists files in a directory (excluding `node_modules` and `.git`).
- `src/env.ts`: Loads and validates environment variables from `.env`.

### Frontend Structure

- Standard Vite + React + TypeScript setup.
- `src/`: Contains React components and application logic.
- `public/`: Static assets.
- The frontend likely communicates with the backend at `http://localhost:3000` (adjust as needed) to trigger deployments via `/deploy` and check status via `/status/:id`.

## AWS Setup

The application requires the following AWS services configured:

- **S3 Bucket**: For storing repository contents and build outputs. Bucket name set via `AWS_BUCKET_NAME`.
- **SQS Queue**: FIFO queue for deployment jobs. Queue URL set via `SQS_QUEUE_URL`.
- **DynamoDB Table**: For storing deployment statuses (ID, status, timestamp). Table name set via `DYNAMO_TABLE_NAME`.
- **AWS Region**: Set via `AWS_REGION`.
- **AWS Credentials**: Access key ID and secret access key set via `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` (or rely on IAM roles if running in AWS environment).

These are configured via the `.env` file in the root directory (see example below). Do not commit actual credentials to version control.

Example `.env`:
```
PORT=3000
AWS_REGION=your-region
AWS_BUCKET_NAME=your-bucket-name
SQS_QUEUE_URL=https://sqs.your-region.amazonaws.com/your-account-id/your-queue.fifo
DYNAMO_TABLE_NAME=your-table-name
# AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY can be added here if not using IAM roles
```

## Important Files and Directories

- `src/worker/uploadDist.ts`: Key file for uploading build artifacts to S3 (recently modified).
- `src/http/staticFromS3.ts`: Middleware for serving deployed assets from S3.
- `src/aws/clients.ts`: Centralized AWS client initialization.
- `frontend/`: Separate Vite-based React application.

## Deployment Flow

1. Frontend (or user) sends `POST /deploy` with `{ repoURL: "https://github.com/user/repo" }`.
2. Backend generates a random ID, creates a DynamoDB item with status "uploaded", and enqueues a job to SQS.
3. Worker loop receives the job, clones the repository into `jobs/{id}/repo/`.
4. If a `package.json` exists, the worker builds the repository using Docker (via `dockerBuildAndExportDist`), outputting to `jobs/{id}/export/dist/`.
5. Worker uploads:
   - The entire repository to S3 under `output/{id}/`.
   - The build output (or repository if no build) to S3 under `dist/{id}/`.
6. Worker updates DynamoDB status through stages: "cloning", "building", "deploying", "deployed".
7. Frontend (or user) can poll `GET /status/:id` to check deployment status.
8. Once deployed, the frontend can access the deployed asset via `http://{id}.localhost:3000` (or appropriate domain) which is served by the `staticFromS3BySubdomain` middleware.

## Notes for Development

- Docker must be installed and running locally for the worker to build repositories (if they contain a `package.json`).
- The worker loop runs in the same process as the Express server; it starts automatically when the server starts.
- Test deployments can be performed with simple Git repositories that have a build script (e.g., Vite, Create React App).
- Ensure the S3 bucket has appropriate CORS settings if serving assets to a different origin during development.
- The `.gitignore` file excludes `node_modules`, build outputs (`dist/`), environment files (`.env.*`), and runtime directories (`output/`), logs, etc.

## Getting Started

1. Copy `.env.example` to `.env` (if exists) or create a `.env` file with the required variables.
2. Install dependencies: `npm install` in both root and `frontend/` directories.
3. Start the backend: `npm run dev` (from root).
4. In a separate terminal, start the frontend: `npm run dev` (from `frontend/` directory).
5. Use the frontend to trigger deployments or use `curl` to test the `/deploy` endpoint.