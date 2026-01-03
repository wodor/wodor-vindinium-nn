#!/bin/bash

# Configuration
SERVICE_NAME="vindinium-ai-commander"
REGION="us-west1"
PROJECT_ID="github-actions-catalog"

# Build and deploy to Cloud Run
gcloud run deploy ${SERVICE_NAME} \
  --source . \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --allow-unauthenticated \
  --port 8080

