const mysql = require('mysql');
const database = require('./database.js');

let db = database.getDatabase();

module.exports.getAllUsers = function() {
    return new Promise(function(resolve, reject) {
        db.query('SELECT * FROM `Users`', function(err, results) {
            if (err) {
                reject(err);
            }
            else {
                resolve(results);
            }
        });
    });
}