@echo off
cd /d "c:\Users\Acer\Desktop\thesis\thesis 2\handwrittenAI\ai-server-deploy"
"C:\Users\Acer\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd" run deploy handwritten-ai-server --source . --region us-central1 --allow-unauthenticated --project handwritten-ai-scorer --memory 2Gi --cpu 2 --concurrency 1 --timeout 900 --quiet > deploy_out.txt 2>&1
