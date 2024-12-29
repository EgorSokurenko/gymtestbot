const cron = require('node-cron');
const moment = require('moment'); // For working with dates and times
const bot = require('../bot'); // Your Telegram bot instance
const TrainingSchedule = require('../models/TrainingSchedule'); // Training schedule model

const UKRAINE_TIMEZONE = 'Europe/Kiev';

// Cron job to check for upcoming trainings and send reminders
cron.schedule('1 * * * *', async () => {
    console.log('Checking for upcoming trainings to send reminders...');
    
    try {
        // Get the current time and the time one hour later
        const now = moment().tz(UKRAINE_TIMEZONE);
        const oneHourLater =now.clone().add(1, 'hours');

        // Find trainings that will start in the next hour
        const upcomingTrainings = await TrainingSchedule.find({
            date: { 
                $gte: now.toDate(), // Trainings starting from now
                $lt: oneHourLater.toDate(), // Trainings starting within the next hour
            }
        }).populate('userIds').lean();

        // Send reminders to all users for each training
        for (const training of upcomingTrainings) {
            for (const user of training.userIds) {

                await bot.sendMessage(
                    user.chatId, 
                    `Привіт! Нагадуємо, що ваше тренування почнеться о ${moment(training.date).format('HH:mm')}.`
                );
            }
        }

        console.log(`Reminders sent for ${upcomingTrainings.length} trainings.`);
    } catch (error) {
        console.error('Error while processing reminders:', error);
    }
});
