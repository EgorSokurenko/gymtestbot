const mongoose = require('mongoose');

const trainingScheduleSchema = new mongoose.Schema({
    trainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', required: true },
    userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    date: { type: Date, required: true },
    maxUsers: { type: Number, required: true }, 
});

module.exports = mongoose.model('TrainingSchedule', trainingScheduleSchema);
