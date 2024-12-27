require('dotenv').config();

module.exports = {
    telegramToken: process.env.TELEGRAM_BOT_TOKEN,
    mongoUri: process.env.MONGO_URI,
    port: process.env.PORT || 3000,
};
