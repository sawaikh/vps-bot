// telegramBot.js
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const { execSync } = require('child_process');

const token = '7873936483:AAFkEOQQt-dQsYYAJo_y4YdVAYTz0ipfsc0';
const bot = new TelegramBot(token, { polling: true });

// ✅ Approved user access control
const approvedUsers = ['7998987449']; // Add more Telegram user IDs if needed

let userSteps = {};
let taskData = {};

// 🔒 Helper function to check access
function isAuthorized(chatId) {
  return approvedUsers.includes(String(chatId));
}

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(chatId)) return bot.sendMessage(chatId, '❌ You are not authorized to use this bot.');
  bot.sendMessage(chatId, `🤖 Welcome to VPS Traffic Bot\n\nCommands:\n/url – Start Task\n/stop – Clear Task\n/status – VPS Reports\n/restart – Restart Dead VPS\n/active – Show active VPS\n/dead – Show dead VPS`);
});

bot.onText(/\/url/, (msg) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(chatId)) return bot.sendMessage(chatId, '❌ You are not authorized to use this bot.');
  userSteps[chatId] = 'get_url';
  bot.sendMessage(chatId, '📍 Please send the website URL:');
});

bot.onText(/\/stop/, (msg) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(chatId)) return bot.sendMessage(chatId, '❌ You are not authorized to use this bot.');
  if (fs.existsSync('task.json')) {
    fs.unlinkSync('task.json');
    try {
      execSync(`git rm task.json && git commit -m "task stopped" && git push`, { stdio: 'inherit' });
      bot.sendMessage(chatId, '🛑 Task stopped and file removed from GitHub.');
    } catch (err) {
      bot.sendMessage(chatId, '❌ Git push failed. Could not remove task.json');
    }
  } else {
    bot.sendMessage(chatId, '⚠️ No active task found.');
  }
});

bot.onText(/\/status/, (msg) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(chatId)) return bot.sendMessage(chatId, '❌ You are not authorized to use this bot.');
  const logFile = 'vps_status_log.txt';

  if (!fs.existsSync(logFile)) {
    bot.sendMessage(chatId, '❌ No VPS status logs found yet.');
    return;
  }

  const logs = fs.readFileSync(logFile, 'utf8').split('\n');
  let success = 0;
  let failed = 0;
  let errors = [];

  for (const line of logs) {
    if (line.includes('✅')) success++;
    if (line.includes('❌')) {
      failed++;
      const match = line.match(/–\s(.+)/);
      if (match) errors.push(match[1]);
    }
  }

  let statusReport = `📊 VPS status:\n✅ Success: ${success}\n❌ Failed: ${failed}`;
  if (errors.length) {
    statusReport += `\n\n❌ Reasons:\n- ${errors.join('\n- ')}`;
  }
  bot.sendMessage(chatId, statusReport);
});

bot.onText(/\/restart/, (msg) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(chatId)) return bot.sendMessage(chatId, '❌ You are not authorized to use this bot.');
  try {
    execSync(`bash restart-vps.sh`, { stdio: 'inherit' });
    bot.sendMessage(chatId, '♻️ Restarted all stopped VPS bots.');
  } catch (e) {
    bot.sendMessage(chatId, '❌ Failed to restart VPS. Check GCloud auth or script path.');
  }
});

bot.onText(/\/active/, (msg) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(chatId)) return bot.sendMessage(chatId, '❌ You are not authorized to use this bot.');
  const logFile = 'vps_status_log.txt';

  if (!fs.existsSync(logFile)) {
    bot.sendMessage(chatId, '❌ No VPS status logs found yet.');
    return;
  }

  const logs = fs.readFileSync(logFile, 'utf8').split('\n');
  const activeList = logs.filter(line => line.includes('✅'));
  bot.sendMessage(chatId, `🟢 Active VPS: ${activeList.length}\n${activeList.join('\n')}`);
});

bot.onText(/\/dead/, (msg) => {
  const chatId = msg.chat.id;
  if (!isAuthorized(chatId)) return bot.sendMessage(chatId, '❌ You are not authorized to use this bot.');
  const logFile = 'vps_status_log.txt';

  if (!fs.existsSync(logFile)) {
    bot.sendMessage(chatId, '❌ No VPS status logs found yet.');
    return;
  }

  const logs = fs.readFileSync(logFile, 'utf8').split('\n');
  const deadList = logs.filter(line => line.includes('❌'));
  bot.sendMessage(chatId, `🔴 Dead VPS: ${deadList.length}\n${deadList.join('\n')}`);
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  if (!userSteps[chatId] || !isAuthorized(chatId)) return;

  switch (userSteps[chatId]) {
    case 'get_url':
      taskData[chatId] = { url: text };
      userSteps[chatId] = 'get_ads';
      bot.sendMessage(chatId, '📢 Click ads? Reply `yes` or `no`');
      break;

    case 'get_ads':
      taskData[chatId].ads = text.toLowerCase();
      userSteps[chatId] = 'get_duration';
      bot.sendMessage(chatId, '🕒 Session duration (in seconds)?');
      break;

    case 'get_duration':
      taskData[chatId].duration = parseInt(text);
      userSteps[chatId] = 'get_scroll';
      bot.sendMessage(chatId, '🔃 How many scrolls?');
      break;

    case 'get_scroll':
      taskData[chatId].scroll = parseInt(text);

      const logFile = 'vps_status_log.txt';
      if (fs.existsSync(logFile)) fs.unlinkSync(logFile);

      fs.writeFileSync('task.json', JSON.stringify(taskData[chatId], null, 2));
      bot.sendMessage(chatId, `✅ Task created! Now uploading to GitHub...`);
      try {
        execSync(`git add task.json && git commit -m "new task" && git push`, { stdio: 'inherit' });
        bot.sendMessage(chatId, '🚀 Task pushed to GitHub. VPS bots will start working.');
      } catch (err) {
        bot.sendMessage(chatId, '❌ Git push failed. Make sure repo is set up locally.');
      }
      userSteps[chatId] = null;
      break;
  }
});