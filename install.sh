#!/bin/bash

sudo apt update -y
sudo apt install -y nodejs npm git curl

# Clone your repo
git clone https://github.com/sawaikh/vps-bot.git
cd vps-bot

# Install required node packages
npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth node-fetch

# Run the bot
nohup node vpsClient.js > output.log 2>&1 &
