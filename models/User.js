/*
Model file for database table
*/

// Require sequelize and our database instance
const Sequelize = require('sequelize');
const databaseWrapper = require('../database.js');

// Get the instance of our database
let database = databaseWrapper.getDatabase();

// Use sequelize to define a new model which will be a table in our database
// and export it
module.exports.User = database.define('User', {
    userId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userName: {
        type: Sequelize.STRING(30),
        unique: true
    },
    email: {
        type: Sequelize.STRING(50),
        unique: true
    },
    password: Sequelize.STRING(80),
    firstName: Sequelize.STRING(50),
    lastName: Sequelize.STRING(50),
    isVerified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
    },
    rejectionCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
    }
});

// Can use sequelize to specify relationships between tables
//  i.e. could import a model called Events and do:

// User.hasMany(Event); automatically creates foreign keys

// see https://web322.ca/notes/week07 for more details
