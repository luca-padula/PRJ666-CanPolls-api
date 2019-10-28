const Sequelize = require('sequelize');
const databaseWrapper = require('../database.js');
const LocationModel = require('./Location.js');
const EventRegistrationModel = require('./EventRegistration.js');

let Location = LocationModel.Location;
let EventRegistration = EventRegistrationModel.EventRegistration;

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
    },
    date_from:{
        type: Sequelize.STRING,
        allowNull:false
    },
    date_to:{
        type: Sequelize.STRING,
        allowNull:false
    },
    time_from:{
        type:Sequelize.STRING,
        allowNull:false
    },
    time_to:{
        type:Sequelize.STRING,
        allowNull:false
    },
    attendee_limit:{
        type:Sequelize.INTEGER,
        allowNull:false
    },
    isApproved:{
        type:Sequelize.BOOLEAN,
        allowNull:false
    }
});
Event.hasOne(Location);
Event.hasMany(EventRegistration);

module.exports = {Event};