const Sequelize = require('sequelize');
const databaseWrapper = require('../database.js');
const LocationModel = require('./Location.js');
const EventRegistrationModel = require('./EventRegistration.js');
const FeedbackModel = require('./Feedback.js');
let Location = LocationModel.Location;
let EventRegistration = EventRegistrationModel.EventRegistration;
let Feedback = FeedbackModel.Feedback;
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
        type: Sequelize.STRING(255),
        allowNull: false
    },
    photo:{
        type: Sequelize.TEXT,
        allowNull: false
    },
    date_from:{
        type: Sequelize.STRING,
        allowNull:false
    },
   /* date_to:{
        type: Sequelize.STRING,
        allowNull:false
    },*/
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
    status:{
        type:Sequelize.CHAR(1),
        allowNull: false,
        defaultValue: 'P'
    }
});

Event.hasOne(Location);
Location.belongsTo(Event);
Event.hasMany(EventRegistration);
EventRegistration.belongsTo(Event);
Event.hasMany(Feedback);

module.exports = {Event};