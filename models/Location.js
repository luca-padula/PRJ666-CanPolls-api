

const Sequelize = require('sequelize');
const databaseWrapper = require('../database.js');

let database = databaseWrapper.getDatabase();

var Location = database.define('Location', {
    location_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    venue_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
    },
    street_name: {
        type: Sequelize.STRING(80),
        allowNull: false
    },
    city: {
        type: Sequelize.STRING(30),
        allowNull: false
    },
    province: {
        type: Sequelize.STRING(30),
        allowNull:false
    },
    postal_code: {
        type: Sequelize.STRING(7),
        allowNull: false
    }
});



module.exports = {Location};