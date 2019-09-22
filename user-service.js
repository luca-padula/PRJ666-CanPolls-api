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
                let newUser = {
                    "userName": userData.userName,
                    "email": userData.email,
                    "password": hash
                };
                console.log(newUser.password);
                let query = db.query('INSERT INTO `Users` (userName, email, password) VALUES (?)', newUser, function(err, results) {
                    if (err) {
                        console.log(err);
                        if (err.errno == 1062) {
                            reject('Username already taken');
                        }
                        else {
                            reject('Error creating user');
                        }
                    }
                    else {
                        resolve('User ' + newUser.userName + ' successfully registered');
                    }
                });
                console.log(query);
            })
            .catch(function(err) {
                reject(err);
            })
        }
    });
}
