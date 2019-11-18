const Sequelize = require('sequelize');
const databaseWrapper = require('../database.js');
const UserModel = require('./User.js');
const EventModel = require('./Event.js');

let User = UserModel.User;
let Event = EventModel.Event;

let database = databaseWrapper.getDatabase();
var Feedback = database.define('Feedback', {
    feedback_id:{
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    feedback_desc:{
        type: Sequelize.STRING,
        allowNull: true
    },
    feedback_rating:{
        type: Sequelize.INTEGER,
        allowNull: false
    },
    feedback_date:{
        type: Sequelize.STRING,
        allowNull: false
    },
    eventEventId:{
        type:Sequelize.INTEGER,
        allowNull: false
    },
    userUserId:{
        type:Sequelize.INTEGER,
        allowNull:false
    }
});
Feedback.belongsTo(Event);
module.exports = {Feedback};