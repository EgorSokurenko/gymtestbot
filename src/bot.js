require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const trainerHandler = require('./handlers/trainerHandler');
const User = require('./models/User');
const { isTrainer } = require('./handlers/utils');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

const SUCCESS_MESSAGE = 'Введіть команду /trainers, щоб отримати список тренерів.\nАбо використовуйте кнопки для запису до тренера.';

const userKeyboard = {
    reply_markup: {
      keyboard: [
        ['Записатись до тренера'], 
        ['Переглянути записи']
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    }
  };
const trainerKeyboard = {
    reply_markup: {
      keyboard: [
        ['Додати тренування'], 
        ['Переглянути свої записи']
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    }
  };  
const registerUser = async (bot, msg) => {
    const chatId = msg.chat.id;
    const name = msg.from.first_name || 'Невідомий';

    try {
        let user = await User.findOne({ chatId });

        if (!user) {
            bot.sendMessage(chatId, `Вітаю, ${name}! Будь ласка, надішліть свій номер телефону для реєстрації.`, {
                reply_markup: {
                    keyboard: [
                        [{ text: 'Надіслати номер телефону', request_contact: true }],
                    ],
                    one_time_keyboard: true,
                    resize_keyboard: true,
                },
            });
        } else {
            const isUserTrainer = await isTrainer(chatId)

            if (isUserTrainer) {
                bot.sendMessage(chatId, `Вітаю, ${name}!\nВикористовуйте опції нижче:`, trainerKeyboard);
            } else {
                bot.sendMessage(chatId, `Вітаю, ${name}!\n${SUCCESS_MESSAGE}`, userKeyboard);
            }
        }
    } catch (error) {
        console.error('Помилка при реєстрації користувача:', error);
        bot.sendMessage(chatId, 'Виникла помилка при додаванні вашого акаунта. Спробуйте пізніше.');
    }
};
const handleContact = async (bot, msg) => {
    const chatId = msg.chat.id;

    if (msg.contact && msg.contact.phone_number) {
        try {
            const phone = msg.contact.phone_number;
            const name = msg.from.first_name || 'Невідомий';
            const isUserTrainer = await isTrainer(chatId)
            let user = await User.findOne({ chatId });
            if (!user) {
                user = new User({
                    chatId,
                    name,
                    phone,
                });
            } else {
                user.phone = phone;
            }

            await user.save();
            bot.sendMessage(chatId, 'Дякую! Ваш номер телефону успішно збережено.');
            bot.sendMessage(chatId, SUCCESS_MESSAGE, isUserTrainer ? trainerKeyboard : userKeyboard);
        } catch (error) {
            console.error('Помилка при збереженні номера телефону:', error);
            bot.sendMessage(chatId, 'Виникла помилка при збереженні вашого номера телефону. Спробуйте пізніше.');
        }
    } else {
        bot.sendMessage(chatId, 'Будь ласка, натисніть кнопку для надсилання номера телефону.');
    }
};

bot.onText(/\/start/, async (msg) => {
    await registerUser(bot, msg);
});

bot.on('contact', async (msg) => {
    await handleContact(bot, msg);
});

trainerHandler(bot);

module.exports = bot;
