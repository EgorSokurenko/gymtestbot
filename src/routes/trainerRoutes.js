const trainerController = require('../controllers/trainerController');

module.exports = [
    {
        method: 'GET',
        path: '/api/trainers',
        handler: trainerController.getAllTrainers,
    },
];
