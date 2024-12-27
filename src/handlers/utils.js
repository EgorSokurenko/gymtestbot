const Trainer = require('../models/Trainer');

const isTrainer = async (chatId) => {
    const trainer = await Trainer.findOne({ chatId });
    return !!trainer;
};

module.exports = {
    isTrainer,
};
