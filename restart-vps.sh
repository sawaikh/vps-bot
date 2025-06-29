#!/bin/bash

declare -a ZONES=("us-east1-b" "us-west1-b" "us-central1-a" "us-east4-a" "us-west2-a" "us-central1-b" "us-west3-a" "us-east1-d")

for zone in "${ZONES[@]}"; do
  echo "🔁 Restarting VPS in zone $zone"
  gcloud compute instances start "vps-$zone" --zone=$zone
  gcloud compute ssh "vps-$zone" --zone=$zone --command "pm2 restart vpsClient || node ~/vpsClient.js &"
done
