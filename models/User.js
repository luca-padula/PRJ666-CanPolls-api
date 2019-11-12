/*
Model file for database table
*/
// Require sequelize and our database instance
const Sequelize = require('sequelize');
const databaseWrapper = require('../database.js');
const EventModel = require('./Event.js');
const EventRegistrationModel = require('./EventRegistration.js');

let Event = EventModel.Event;
let EventRegistration = EventRegistrationModel.EventRegistration;

// Get the instance of our database
let database = databaseWrapper.getDatabase();

// Use sequelize to define a new model which will be a table in our database
var User = database.define('User', {
    userId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    isAdmin: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    userName: {
        type: Sequelize.STRING(30),
        allowNull: false,
        unique: true
    },
    email: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
    },
    password: {
        type: Sequelize.STRING(80),
        allowNull: false
    },
    firstName: {
        type: Sequelize.STRING(50),
        allowNull: false
    },
    lastName: {
        type: Sequelize.STRING(50),
        allowNull: false
    },
    isVerified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    accountStatus: {
           type: Sequelize.CHAR,
             defaultValue: 'A',
             allowNull: false
    },
    verificationHash: {
        type: Sequelize.STRING(80),
        allowNull: false
    },
    partyAffiliation: Sequelize.STRING(50),
    affiliationApproved: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    rejectionCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
     }
});

// Can use sequelize to specify relationships between tables
//  i.e. could import a model called Events and do:

 User.hasMany(Event); //- automatically creates foreign keys
 Event.belongsTo(User);
 User.hasMany(EventRegistration);
 EventRegistration.belongsTo(User);

// see https://web322.ca/notes/week07 for more details

// Export User model to use in other modules
module.exports = {User};
