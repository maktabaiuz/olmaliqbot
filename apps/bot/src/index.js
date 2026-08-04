"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const grammy_1 = require("grammy");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: '../../.env' });
const token = process.env.BOT_TOKEN || 'mock_token';
console.log('🤖 "Kim bor?" Telegram Bot initialize bo\'lmoqda...');
if (token === 'mock_bot_token' || token === 'mock_token') {
    console.log('⚠️ Warning: BOT_TOKEN o\'rnatilmadi. Mock rejimida ishlaydi.');
}
else {
    const bot = new grammy_1.Bot(token);
    bot.command('start', (ctx) => ctx.reply('"Kim bor?" boti ishga tushdi! 🚀'));
    bot.start();
}
//# sourceMappingURL=index.js.map