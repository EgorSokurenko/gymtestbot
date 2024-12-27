require('dotenv').config();
const Hapi = require('@hapi/hapi');
const mongoose = require('mongoose');
const bot = require('./bot');
const trainerRoutes = require('./routes/trainerRoutes');

const init = async () => {
    const server = Hapi.server({
        port: process.env.PORT || 3000,
        host: 'localhost',
    });

    // Connect to MongoDB
    mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }).then(() => console.log('MongoDB connected'))
      .catch(err => console.error('MongoDB connection error:', err));

    // Register Routes
    server.route(trainerRoutes);

    await server.start();
    console.log(`Server running on ${server.info.uri}`);

};

process.on('unhandledRejection', (err) => {
    console.log(err);
    process.exit(1);
});

init();
