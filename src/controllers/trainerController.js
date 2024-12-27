const Trainer = require('../models/Trainer');

exports.getAllTrainers = async (request, h) => {
    try {
        const trainers = await Trainer.find();
        return h.response(trainers).code(200);
    } catch (error) {
        console.error(error);
        return h.response({ error: 'Failed to fetch trainers' }).code(500);
    }
};
