const Sequelize = require('sequelize');
const databaseWrapper = require('../database.js');

let database = databaseWrapper.getDatabase();

var Event = database.define('Event', {
    event_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    event_title: {
        type: Sequelize.STRING(100),
        allowNull: false,
    },
    event_description: {
        type: Sequelize.STRING,
        allowNull: false
    }
});
module.exports = {Event};