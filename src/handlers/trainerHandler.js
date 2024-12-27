const Trainer = require('../models/Trainer');
const User = require('../models/User');
const TrainingSchedule = require('../models/TrainingSchedule');
const { isTrainer } = require('./utils');

const registerCommands = (bot) => {

    // === Fetch list of all trainers ===
    const listTrainers = async (chatId) => {
        try {
            const trainers = await Trainer.find();

            if (trainers.length > 0) {
                const trainerList = trainers
                    .map((trainer, index) => `${index + 1}. ${trainer.name} - ${trainer.phone || 'Телефон не вказаний'}`)
                    .join('\n');
                await bot.sendMessage(chatId, `Ось список доступних тренерів:\n\n${trainerList}\n\nЗаписатися: /book_training`);
            } else {
                await bot.sendMessage(chatId, 'На даний момент немає доступних тренерів.');
            }
        } catch (error) {
            console.error('Error fetching trainers:', error);
            await bot.sendMessage(chatId, 'Виникла помилка при отриманні списку тренерів. Спробуйте пізніше.');
        }
    };

    // === Step-by-step addition of a training date ===
    const steps = {}; // Object to store step-by-step data for users
    const startAddTrainingDate = async (chatId) => {
        steps[chatId] = { step: 1 }; // Initialize step
        await bot.sendMessage(chatId, 'Введіть дату у форматі день.місяць (наприклад: 25.12):');
    };

    const handleAddTrainingDateStep = async (chatId, text) => {
        const currentStep = steps[chatId]?.step;

        if (currentStep === 1) {
            // Step 1: Collect the date
            const [day, month] = text.split('.');

            if (!day || !month || isNaN(day) || isNaN(month)) {
                await bot.sendMessage(chatId, 'Некоректний формат дати. Введіть дату у форматі день.місяць (наприклад: 25.12):');
                return;
            }

            steps[chatId].day = parseInt(day, 10);
            steps[chatId].month = parseInt(month, 10);
            steps[chatId].step = 2;

            await bot.sendMessage(chatId, 'Введіть час у форматі години:хвилини (наприклад: 14:30):');
        } else if (currentStep === 2) {
            // Step 2: Collect the time
            const [hours, minutes] = text.split(':');

            if (!hours || !minutes || isNaN(hours) || isNaN(minutes)) {
                await bot.sendMessage(chatId, 'Некоректний формат часу. Введіть час у форматі години:хвилини (наприклад: 14:30):');
                return;
            }

            steps[chatId].hours = parseInt(hours, 10);
            steps[chatId].minutes = parseInt(minutes, 10);
            steps[chatId].step = 3;

            await bot.sendMessage(chatId, 'Введіть максимальну кількість місць:');
        } else if (currentStep === 3) {
            // Step 3: Collect the maximum number of users
            const maxUsers = parseInt(text, 10);

            if (isNaN(maxUsers) || maxUsers <= 0) {
                await bot.sendMessage(chatId, 'Некоректне значення. Введіть максимальну кількість місць:');
                return;
            }

            steps[chatId].maxUsers = maxUsers;

            const { day, month, hours, minutes } = steps[chatId];

            const date = new Date();
            date.setDate(day);
            date.setMonth(month - 1); // Month is 0-indexed
            date.setHours(hours);
            date.setMinutes(minutes);
            date.setSeconds(0);
            date.setMilliseconds(0);

            if (isNaN(date.getTime())) {
                await bot.sendMessage(chatId, 'Некоректна дата. Почніть знову командою /add_date');
                delete steps[chatId];
                return;
            }

            const trainer = await Trainer.findOne({ chatId });

            if (!trainer) {
                await bot.sendMessage(chatId, 'У вас немає прав для виконання цієї команди.');
                delete steps[chatId];
                return;
            }

            const newSchedule = new TrainingSchedule({
                trainerId: trainer._id,
                userIds: [],
                date,
                maxUsers,
            });

            await newSchedule.save();

            const formattedDate = date.toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'short' });
            await bot.sendMessage(chatId, `Дата ${formattedDate} успішно додана. Максимальна кількість користувачів: ${maxUsers}.`);

            delete steps[chatId]; // Clear the steps for the user
        } else {
            await bot.sendMessage(chatId, 'Почніть знову командою /add_date');
            delete steps[chatId];
        }
    };
    // === Get user or trainer's bookings ===
    const getMyBookings = async (chatId) => {
        try {
            const trainer = await Trainer.findOne({ chatId });

            if (trainer) {
                const now = new Date();
                const trainerBookings = await TrainingSchedule.find({
                    trainerId: trainer._id,
                    date: { $gte: now },
                }).populate('userIds').sort({ date: 1 });

                if (trainerBookings.length === 0) {
                    await bot.sendMessage(chatId, 'Наразі у вас немає записів на майбутні тренування.');
                    return;
                }

                const bookingList = trainerBookings.map((booking) => {
                    const formattedDate = new Date(booking.date).toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'short' });
                    const users = booking.userIds.map((user) => `- Ім'я: ${user.name}`).join('\n');
                    return `Дата: ${formattedDate}\nЗаписані користувачі:\n${users}`;
                }).join('\n---\n');

                await bot.sendMessage(chatId, `Ваші тренування:\n\n${bookingList}`);
            } else {
                const user = await User.findOne({ chatId });

                if (!user) {
                    await bot.sendMessage(chatId, 'Ваш профіль не знайдено. Будь ласка, зареєструйтесь.');
                    return;
                }

                const now = new Date();
                const userBookings = await TrainingSchedule.find({
                    userIds: user._id,
                    date: { $gte: now },
                }).populate('trainerId').sort({ date: 1 });

                if (userBookings.length === 0) {
                    await bot.sendMessage(chatId, 'У вас немає актуальних записів.');
                    return;
                }

                const bookingList = userBookings.map((booking) => {
                    const trainerName = booking.trainerId?.name || 'Невідомий тренер';
                    const formattedDate = new Date(booking.date).toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'short' });
                    return `Тренер: ${trainerName}\nДата: ${formattedDate}`;
                }).join('\n---\n');

                await bot.sendMessage(chatId, `Ваші актуальні записи:\n\n${bookingList}`);
            }
        } catch (error) {
            console.error('Error fetching bookings:', error);
            await bot.sendMessage(chatId, 'Сталася помилка при отриманні записів. Спробуйте пізніше.');
        }
    };

// === Fetch available trainers ===
    const fetchTrainerList = async (chatId) => {
        try {
            const trainers = await Trainer.find();

            if (trainers.length === 0) {
                await bot.sendMessage(chatId, 'Наразі немає доступних тренерів.');
                return;
            }

            const trainerButtons = trainers.map((trainer) => ({
                text: trainer.name,
                callback_data: `select_trainer_${trainer._id}`,
            }));

            await bot.sendMessage(chatId, 'Оберіть тренера:', {
                reply_markup: {
                    inline_keyboard: [trainerButtons],
                },
            });
        } catch (error) {
            console.error('Error fetching trainers:', error);
            await bot.sendMessage(chatId, 'Сталася помилка під час отримання списку тренерів. Спробуйте пізніше.');
        }
    };


    // === Fetch available training sessions for a trainer ===
    const fetchTrainerSchedule = async (chatId, trainerId) => {
        try {
            const now = new Date();
            let schedules = await TrainingSchedule.find({
                trainerId,
                date: { $gte: now },
            }).sort({ date: 1 }).lean();

            schedules = schedules.filter((schedule) => schedule.userIds.length < schedule.maxUsers);

            if (schedules.length === 0) {
                await bot.sendMessage(chatId, 'У цього тренера наразі немає доступних тренувань.');
                return;
            }

            const dateButtons = schedules.map((schedule) => {
                const date = new Date(schedule.date);
                const formattedDate = `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                return {
                    text: formattedDate,
                    callback_data: `select_date_${schedule._id}`,
                };
            });

            await bot.sendMessage(chatId, 'Оберіть дату тренування:', {
                reply_markup: {
                    inline_keyboard: [dateButtons],
                },
            });
        } catch (error) {
            console.error('Error fetching training schedules:', error);
            await bot.sendMessage(chatId, 'Сталася помилка під час отримання розкладу тренувань. Спробуйте пізніше.');
        }
    };

    // === Confirm booking for a session ===
    const confirmBooking = async (chatId, scheduleId, query) => {
        try {
            const schedule = await TrainingSchedule.findById(scheduleId).populate('trainerId');

            if (!schedule) {
                await bot.sendMessage(chatId, 'Це тренування більше недоступне.');
                return;
            }

            const user = await User.findOne({ chatId });

            if (!user) {
                await bot.sendMessage(chatId, 'Ваш профіль не знайдено. Будь ласка, зареєструйтесь.');
                return;
            }

            if (schedule?.userIds?.length && schedule?.userIds?.includes(user._id)) {
                await bot.sendMessage(chatId, 'Ви вже записані на це тренування.');
                return;
            }

            if (schedule?.userIds?.length >= schedule.maxUsers) {
                await bot.sendMessage(chatId, 'Це тренування вже заповнене.');
                return;
            }

            schedule.userIds.push(user._id);
            await schedule.save();

            await bot.sendMessage(chatId, 'Ви успішно записалися на тренування!');

            const trainerChatId = schedule.trainerId.chatId;
            const formattedDate = new Date(schedule.date).toLocaleString('uk-UA', {
                dateStyle: 'short',
                timeStyle: 'short',
            });

            const telegramAccount = query.message.chat.username
                ? `@${query.message.chat.username}`
                : `Ім'я: ${query.message.chat.first_name}${query.message.chat.last_name ? ` ${query.message.chat.last_name}` : ''}`;

            await bot.sendMessage(
                trainerChatId,
                `Новий запис на тренування:\n\nКористувач: ${telegramAccount}\nДата: ${formattedDate}`
            );
        } catch (error) {
            console.error('Error confirming booking:', error);
            await bot.sendMessage(chatId, 'Сталася помилка під час запису. Спробуйте пізніше.');
        }
    };

    // === Commands registration ===
    bot.onText(/\/trainers/, (msg) => listTrainers(msg.chat.id));

    bot.onText(/\/add_date (.+)/, (msg, match) => addTrainingDate(msg.chat.id, match[1]));

    bot.onText(/\/my_bookings/, (msg) => getMyBookings(msg.chat.id));

    bot.onText(/\/book_training/, (msg) => fetchTrainerList(msg.chat.id));

    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text;

        try {

            if (steps[chatId]?.step) {
                await handleAddTrainingDateStep(chatId, text);
                return;
            }


            if (text === 'Переглянути записи') {
                await getMyBookings(chatId);
            } else if (text === 'Записатись до тренера') {
                await fetchTrainerList(chatId);
            } else if(text === 'Додати тренування') {
                await startAddTrainingDate(chatId);
            }

        } catch (error) {
            console.error('Error processing message:', error);
            await bot.sendMessage(chatId, 'Сталася помилка. Спробуйте пізніше.');
        }
    });

    bot.on('callback_query', async (query) => {
        const chatId = query.message.chat.id;
        const data = query.data;

        if (data.startsWith('select_trainer_')) {
            const trainerId = data.replace('select_trainer_', '');
            await fetchTrainerSchedule(chatId, trainerId);
        }

        if (data.startsWith('select_date_')) {
            const scheduleId = data.replace('select_date_', '');
            await bot.sendMessage(chatId, `Ви хочете записатися на тренування?`, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: 'Так', callback_data: `confirm_booking_${scheduleId}` },
                            { text: 'Ні', callback_data: 'cancel_booking' },
                        ],
                    ],
                },
            });
        }

        if (data.startsWith('confirm_booking_')) {
            const scheduleId = data.replace('confirm_booking_', '');
            await confirmBooking(chatId, scheduleId, query);
        }

        if (data === 'cancel_booking') {
            await bot.sendMessage(chatId, 'Запис скасовано.');
        }
    });
};

module.exports = registerCommands;
