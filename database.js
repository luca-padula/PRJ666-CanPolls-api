/*
Wrapper file for the instance of our database that will be shared among all of our modules
*/

const mysql = require('mysql');

var database = mysql.createConnection({
    host     : 'mymysql.senecacollege.ca',
    user     : 'prj666_193a03',
    password : 'adQZ@8552',
    database : 'prj666_193a03'
});

module.exports.initializeDatabase = function() {
    return new Promise(function(resolve, reject) {
        database.connect(function(err) {
            if (err) {
                reject('unable to connect to database: ' + err.message);
            }
            else {
                resolve();
            }
        });
    });
}

// function to get the instance of the database to use in a different module
module.exports.getDatabase = function() {
    return database;
}
