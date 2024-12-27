const mongoose = require('mongoose');

const trainerSchema = new mongoose.Schema({
    chatId: { type: Number, required: true },
    name: { type: String, required: true },
    phone: { type: String },
    specialty: { type: String },
    availableDates: [Date],
});

module.exports = mongoose.model('Trainer', trainerSchema);
