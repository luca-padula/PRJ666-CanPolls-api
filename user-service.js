const bcrypt = require('bcryptjs');

// Import user model
const UserModel = require('./models/User.js');

let User = UserModel.User;

// Example function to see protection of a route using JWT, will be removed
module.exports.getAllUsers = function() {
    return new Promise((resolve, reject) => {
        User.findAll({})
            .then((users) => {
                resolve(users);
            })
            .catch((err) => {
                reject('An error occured');
            });
    });
}

module.exports.registerUser = function(userData) {
    return new Promise((resolve, reject) => {
        bcrypt.hash(userData.password, 10)
        .then((hash) => {
            User.create({
                userName: userData.userName,
                email: userData.email,
                password: hash,
                firstName: userData.firstName,
                lastName: userData.lastName
            })
            .then(() => {
                resolve('User ' + userData.userName + ' successfully registered');
            })
            .catch((err) => {
                reject('Couldnt register user');
            })
        })
        .catch((err) => {
            reject(err);
        })
    });
}

module.exports.findUserByUsername = function(username) {
    return new Promise((resolve, reject) => {
        User.findAll({
            where: {
                userName: username
            }
        })
        .then((users) => {
            resolve(users);
        })
        .catch((err) => {
            reject('An error occured');
        })
    });
}

module.exports.findUserByEmail = function(email) {
    return new Promise((resolve, reject) => {
        User.findAll({
            where: {
                email: email
            }
        })
        .then((users) => {
            resolve(users);
        })
        .catch((err) => {
            reject('An error occured');
        })
    });
}

module.exports.checkUser = function(userData) {
    return new Promise((resolve, reject) => {
        User.findOne({
            where: {
                userName: userData.userName
            }
        })
        .then((foundUser) => {
            if (foundUser) {
                bcrypt.compare(userData.password, foundUser.password)
                .then((match) => {
                    if (match)
                        resolve(foundUser);
                    else
                        reject('Incorrect email, username, or password entered');
                })
                .catch((err) => {
                    reject('Error comparing passwords');
                });
            }
            else {
                User.findOne({
                    where: {
                        email: userData.userName
                    }
                })
                .then((foundUser) => {
                    if (foundUser) {
                        bcrypt.compare(userData.password, foundUser.password)
                        .then((match) => {
                            if (match)
                                resolve(foundUser);
                            else
                                reject('Incorrect email, username, or password entered');
                        })
                        .catch((err) => {
                            reject('Error comparing passwords');
                        });
                    }
                    else {
                        reject('Incorrect email, username, or password entered');
                    }
                });
            }
        })
        .catch((err) => {
            console.log(err);
            reject('An error occured');
        });
    });
}
