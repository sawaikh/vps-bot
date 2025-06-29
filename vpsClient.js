const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fetch = require('node-fetch');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const TELEGRAM_BOT_TOKEN = '7873936483:AAFkEOQQt-dQsYYAJo_y4YdVAYTz0ipfsc0';
const CHAT_ID = 'traffic_bott'; // Replace with your Telegram user ID
const BOT_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const CHECK_INTERVAL = 10000;

async function sendStatus(msg) {
  await fetch(`${BOT_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text: msg })
  });
}

async function runTask(task) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({
    referer: Math.random() < 0.5 ? 'https://www.google.com/' : 'https://www.facebook.com/'
  });

  try {
    await page.goto(task.url, { timeout: 30000, waitUntil: 'domcontentloaded' });

    for (let i = 0; i < task.scroll; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await new Promise(res => setTimeout(res, 2000));
    }

    if (task.ads === 'yes') {
      const links = await page.$$('a');
      if (links.length > 0) {
        await links[0].click();
      }
    }

    await new Promise(res => setTimeout(res, task.duration * 1000));
    await sendStatus(`✅ Task success: ${task.url}`);
  } catch (err) {
    await sendStatus(`❌ Task failed: ${err.message}`);
  } finally {
    await browser.close();
  }
}

async function fetchTask() {
  try {
    const res = await fetch('https://raw.githubusercontent.com/sawaikh/vps-bot/main/task.json');
    if (res.status === 200) {
      const task = await res.json();
      await runTask(task);
    }
  } catch (e) {
    console.log("No task file or invalid format");
  }
}

async function loop() {
  while (true) {
    await fetchTask();
    await new Promise(r => setTimeout(r, CHECK_INTERVAL));
  }
}

loop();
