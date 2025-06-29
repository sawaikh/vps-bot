#!/bin/bash

echo "🚀 Starting VPS Bot Installer..."

PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
  echo "❌ No Google Cloud project found. Please select or create one manually and ensure billing is enabled."
  exit 1
fi

echo "📦 Using existing project: $PROJECT_ID"

# Enable Compute Engine if not enabled
gcloud services enable compute.googleapis.com --quiet || {
  echo "❌ Failed to enable compute.googleapis.com. Make sure billing is active for project: $PROJECT_ID"
  exit 1
}

ZONES=(us-central1-a us-central1-b us-central1-c us-east1-b us-east1-c us-west1-b us-west1-c us-west2-a)

for i in "${!ZONES[@]}"; do
  (
    NAME="bot-vps-$i"
    ZONE="${ZONES[$i]}"
    echo "⏳ Creating $NAME in $ZONE..."
    gcloud compute instances create-with-container $NAME \
      --zone=$ZONE \
      --container-image=ubuntu \
      --container-command="/bin/bash" \
      --container-arg="-c" \
      --container-arg="apt update && apt install -y curl git && curl -s https://raw.githubusercontent.com/sawaikh/vps-bot/main/install.sh | bash" \
      --tags=http-server,https-server \
      --quiet && echo "✅ $NAME launched." || echo "❌ $NAME failed."
  ) &
done

wait
echo "✅ All VPS setup tasks finished."
