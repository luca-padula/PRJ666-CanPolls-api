const bcrypt = require('bcryptjs');
const database = require('./database.js');

let db = database.getDatabase();

module.exports.registerUser = function(userData) {
    return new Promise(function(resolve, reject) {
        if (userData.password != userData.password2) {
            reject('Passwords do not match');
        }
        else {
            bcrypt.hash(userData.password, 10).then(function(hash) {
                let query = db.query('INSERT INTO `Users` (userName, email, password) VALUES (?, ?, ?)',
                [userData.userName, userData.email, hash], function(err, results) {
                    if (err) {
                        if (err.errno == 1062) {
                            reject('Username already taken');
                        }
                        else {
                            reject('Error creating user');
                        }
                    }
                    else {
                        resolve('User ' + userData.userName + ' successfully registered');
                    }
                });
                console.log(query.sql);
            })
            .catch(function(err) {
                reject(err);
            })
        }
    });
}

module.exports.checkUser = function(userData) {
    return new Promise(function(resolve, reject) {
        let foundUser;
        db.query('SELECT * FROM `Users` WHERE `email` = ?', [userData.user], function(err, results) {
            if (err) {
                reject(err);
            }
            else if (results.length != 0) {
                console.log(results[0]);
                foundUser = results[0];
                bcrypt.compare(userData.password, foundUser.password).then(function(passwordsMatch) {
                    if (passwordsMatch) {
                        resolve(foundUser);
                    }
                    else {
                        reject('Incorrect email, username, or password entered');
                    }
                }).catch(function(err) {
                    reject('error comparing passwords');
                });
            }
            else {
                db.query('SELECT * FROM `Users` WHERE `userName` = ?', [userData.user], function(err, results) {
                    if (err) {
                        reject(err);
                    }
                    else if (results.length != 0) {
                        console.log(results[0]);
                        foundUser = results[0];
                        bcrypt.compare(userData.password, foundUser.password).then(function(passwordsMatch) {
                            if (passwordsMatch) {
                                resolve(foundUser);
                            }
                            else {
                                reject('Incorrect email, username, or password entered');
                            }
                        }).catch(function(err) {
                            reject('error comparing passwords');
                        });
                    }
                    else {
                        reject('Incorrect email, username, or password entered');
                    }
                });
            }
        });
    });
}
