import { Bot } from 'grammy';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const token = process.env.BOT_TOKEN || 'mock_token';

console.log('🤖 "Kim bor?" Telegram Bot initialize bo\'lmoqda...');

if (token === 'mock_bot_token' || token === 'mock_token') {
  console.log('⚠️ Warning: BOT_TOKEN o\'rnatilmadi. Mock rejimida ishlaydi.');
} else {
  const bot = new Bot(token);
  bot.command('start', (ctx) => ctx.reply('"Kim bor?" boti ishga tushdi! 🚀'));
  bot.start();
}
