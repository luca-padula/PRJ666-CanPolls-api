const bcrypt = require('bcryptjs');
const database = require('./database.js');

let db = database.getDatabase();

// Example function to see protection of a route using JWT, will be removed
module.exports.getAllUsers = function() {
    return new Promise((resolve, reject) => {
        db.query('SELECT * FROM `Users`', (err, results) => {
            if (err) {
                reject('couldnt get users');
            }
            else {
                resolve(results);
            }
        });
    });
}

module.exports.getUserById = function(id) {
    return new Promise((resolve, reject) => {
        db.query('SELECT * FROM `Users` where `userId` = ?', [id],(err, results) => {
            if (err) {
                reject('couldnt get users');
            }
            else {
                resolve(results);
            }
        });
    });
}


module.exports.registerUser = function(userData) {
    return new Promise((resolve, reject) => {
        bcrypt.hash(userData.password, 10).then((hash) => {
            let query = db.query('INSERT INTO `Users` (userName, email, password) VALUES (?, ?, ?)',
            [userData.userName, userData.email, hash], (err, results) => {
                if (err) {
                    console.log(err);
                    if (err.errno == 1062) {
                        reject('Username is already taken');
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
        .catch((err) => {
            reject(err);
        })
    });
}

module.exports.checkIfExists = function(field, value) {
    return new Promise((resolve, reject) => {
        let sql = 'SELECT * FROM `Users` WHERE ' + db.escapeId(field) + ' = ?';
        db.query(sql, [value], (err, results) => {
            if (err) {
                reject('An error occured');
            }
            else {
                resolve(results);
            }
        });
    });
}

module.exports.checkUser = function(userData) {
    return new Promise((resolve, reject) => {
        let foundUser;
        db.query('SELECT * FROM `Users` WHERE `email` = ?', [userData.userName], (err, results) => {
            if (err) {
                reject('An error occured');
            }
            else if (results.length != 0) {
                console.log(results[0]);
                foundUser = results[0];
                bcrypt.compare(userData.password, foundUser.password).then((passwordsMatch) => {
                    if (passwordsMatch) {
                        resolve(foundUser);
                    }
                    else {
                        reject('Incorrect email, username, or password entered');
                    }
                }).catch((err) => {
                    reject('error comparing passwords');
                });
            }
            else {
                db.query('SELECT * FROM `Users` WHERE `userName` = ?', [userData.userName], (err, results) => {
                    if (err) {
                        reject('An error occured');
                    }
                    else if (results.length != 0) {
                        console.log(results[0]);
                        foundUser = results[0];
                        bcrypt.compare(userData.password, foundUser.password).then((passwordsMatch) => {
                            if (passwordsMatch) {
                                resolve(foundUser);
                            }
                            else {
                                reject('Incorrect email, username, or password entered');
                            }
                        }).catch((err) => {
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
