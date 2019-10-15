const Sequelize = require('sequelize');
const databaseWrapper = require('../database.js');

let database = databaseWrapper.getDatabase();

var EventRegistration = database.define('EventRegistration', {
    registrationId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    status: {
        type: Sequelize.STRING(20),
        defaultValue: 'registered',
        allowNull: false
    }
});

module.exports = {EventRegistration}