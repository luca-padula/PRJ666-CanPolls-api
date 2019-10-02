/*
Wrapper file for the instance of our database that will be shared among all of our modules
*/

const Sequelize = require('sequelize');

const database = new Sequelize('prj666_193a03', 'prj666_193a03', 'adQZ@8552', {
    host: 'mymysql.senecacollege.ca',
    dialect: 'mysql',
});

// Function to get the instance of the database to use in a different module
module.exports.getDatabase = function() {
    return database;
}

// Function to initialize database connection when starting server
module.exports.initializeDatabase = function() {
    return new Promise((resolve, reject) => {
        database
            .authenticate()
            .then(database.sync())
            .then(() => {
                resolve();
            })
            .catch((err) => {
                reject(err);
            });
    });
}
