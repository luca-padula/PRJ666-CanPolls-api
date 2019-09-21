const bcrypt = require('bcryptjs');
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

module.exports.registerUser = function(userData) {
    return new Promise(function(resolve, reject) {
        if (userData.password != userData.password2) {
            reject('Passwords do not match');
        }
        else {
            bcrypt.hash(userData.password, 10).then(function(hash) {
                userData.password = hash;
                console.log(hash);
                db.query('INSERT INTO `Users` (userName, email, password) VALUES ?',
                [userdata.userName, userData.email, userData.password], function(err, results) {
                    if (err) {
                        console.log('error');
                        if (err.code == 1062) {
                            reject('Username already taken');
                        }
                        else {
                            reject('Error creating user: ' + err);
                        }
                    }
                    else {
                        resolve('User ' + userData.userName + ' successfully registered');
                    }
                });
            })
            .catch(function(err) {
                reject(err);
            })
        }
    });
}
