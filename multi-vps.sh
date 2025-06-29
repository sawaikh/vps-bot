#!/bin/bash

PROJECT_ID="traffic-project-$RANDOM"
ZONES=("us-central1-a" "us-east1-b" "us-east4-c" "us-west1-b" "us-west2-a" "us-west3-b" "us-west4-a" "northamerica-northeast1-a")

echo "⏳ Creating Google Cloud Project..."
gcloud projects create $PROJECT_ID
gcloud config set project $PROJECT_ID
gcloud services enable compute.googleapis.com

echo "🌐 Setting default config..."
gcloud config set compute/region us-central1
gcloud config set compute/zone us-central1-a

echo "🚪 Creating firewall rule..."
gcloud compute firewall-rules create allow-ssh \
  --allow tcp:22 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=ssh

i=1
for ZONE in "${ZONES[@]}"; do
  INSTANCE_NAME="vps-$i"
  echo "🚀 Creating VPS $INSTANCE_NAME in zone $ZONE..."

  gcloud compute instances create "$INSTANCE_NAME" \
    --zone="$ZONE" \
    --machine-type=f1-micro \
    --tags=ssh \
    --metadata=startup-script='
      sudo apt update -y && sudo apt install -y curl git nodejs npm
      git clone https://github.com/sawaikh/vps-bot.git
      cd vps-bot
      npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth node-fetch
      nohup node vpsClient.js > log.txt 2>&1 &
    '

  ((i++))
done

echo "✅ All 8 VPS created and bots started."
