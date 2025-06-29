// vpsClient.js – Cloudflare Bypass & Smart Traffic Bot
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const os = require('os');
const { execSync } = require('child_process');

puppeteer.use(StealthPlugin());

const TASK_FILE = 'https://raw.githubusercontent.com/sawaikh/vps-bot/main/task.json';
const CHECK_INTERVAL = 10000; // 10 sec

let lastTask = null;

async function fetchTask() {
  try {
    const res = await axios.get(TASK_FILE, { headers: { 'Cache-Control': 'no-cache' }});
    return res.data;
  } catch (err) {
    return null;
  }
}

function logStatus(msg) {
  const hostname = os.hostname();
  const logMsg = `${hostname} – ${msg}`;
  fs.appendFileSync('vps_status_log.txt', `\n${logMsg}`);
  console.log(logMsg);
}

async function runTask(task) {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox'] });
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1366, height: 768 });
    await page.setExtraHTTPHeaders({ 'Referer': Math.random() > 0.5 ? 'https://facebook.com' : 'https://google.com' });

    await page.goto(task.url, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForTimeout(7000); // Cloudflare challenge wait

    for (let i = 0; i < task.scroll; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await page.waitForTimeout(2000);
    }

    if (task.ads === 'yes') {
      try {
        const adFrame = await page.$('iframe');
        if (adFrame) {
          const adBox = await adFrame.boundingBox();
          await page.mouse.click(adBox.x + 5, adBox.y + 5);
        }
      } catch {}
    }

    await page.waitForTimeout(task.duration * 1000);
    logStatus('✅ Success');
  } catch (err) {
    logStatus(`❌ Failed – ${err.message.split('\n')[0]}`);
  } finally {
    if (browser) {
      await browser.close();
      execSync('rm -rf ~/.cache/puppeteer');
    }
  }
}

async function mainLoop() {
  while (true) {
    const task = await fetchTask();

    if (!task && lastTask) {
      lastTask = null;
      logStatus('🛑 Task stopped (file deleted)');
    }

    if (task && JSON.stringify(task) !== JSON.stringify(lastTask)) {
      lastTask = task;
      logStatus('🚀 New task started');
      await runTask(task);
    }

    await new Promise(r => setTimeout(r, CHECK_INTERVAL));
  }
}

mainLoop();
