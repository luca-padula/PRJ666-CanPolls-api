const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const mailService = require('./mail-service.js');

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

module.exports.getUserById = function(id) {
    return new Promise((resolve, reject) => {
        db.query('SELECT * FROM `Users` where `userId` = ?', [id],(err, results) => {
            if (err) {
                reject('couldnt get users');
                console.log("not rejected");
            }
            else {
                resolve(results);
                console.log(results);
            }
        });
    });
}


module.exports.registerUser = function(userData) {
    return new Promise((resolve, reject) => {
        bcrypt.hash(userData.password, 10)
            .then((hash) => {
                let randomString = crypto.randomBytes(32).toString('hex');
                let randomHash = bcrypt.hashSync(randomString, 10).replace('\/', '');
                User.create({
                    userName: userData.userName,
                    email: userData.email,
                    password: hash,
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    verificationHash: randomHash
                })
                    .then((createdUser) => {
                        let mailLink = mailService.appUrl + '\/verifyEmail\/' + createdUser.userId +
                            '\/' + createdUser.verificationHash;
                        let mailText = 'Hello ' + createdUser.firstName + ',\nthank you for registering with Canpolls. ' +
                            'Please click the link below to verify your account.\n' + mailLink;
                        let mailData = {
                            from: mailService.appFromEmailAddress,
                            to: createdUser.email,
                            subject: 'PRJ666 Canpolls Acount Verification',
                            text: mailText
                        };
                        mailService.sendEmail(mailData)
                            .then(() => resolve('User ' + userData.userName + ' successfully registered'))
                            .catch((msg) => reject('Error sending verification email'));
                        
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

module.exports.verifyUser = function(userId, token) {
    return new Promise((resolve, reject) => {
        User.findOne({
            where: {
                userId: userId
            }
        })
            .then((foundUser) => {
                if ( !foundUser || foundUser.isVerified || (token != foundUser.verificationHash)) {
                    return reject('Either you have the wrong link, or the user has already been verified');
                }
                User.update({
                    isVerified: true
                }, {
                    where: { userId: foundUser.userId }
                })
                    .then(() => {
                        resolve('User ' + foundUser.userName + ' successfully verified');
                    })
                    .catch((err) => {
                        console.log(err);
                        reject('Error updating user');
                    });
            })
            .catch((err) => {
                console.log(err);
                reject('An error occured');
            });
    });
}

module.exports.findUserByUsername = function(username) {
    return new Promise((resolve, reject) => {
        User.findOne({
            where: {
                userName: username
            }
        })
        .then((user) => {
            resolve(user);
        })
        .catch((err) => {
            reject('An error occured');
        })
    });
}

module.exports.findUserByEmail = function(email) {
    return new Promise((resolve, reject) => {
        User.findOne({
            where: {
                email: email
            }
        })
        .then((user) => {
            resolve(user);
        })
        .catch((err) => {
            reject('An error occured');
        })
    });
}

module.exports.checkUser = function (userData) {
    return new Promise((resolve, reject) => {
        this.findUserByUsername(userData.userName)
            .then((foundUser) => {
                if (foundUser) {
                    if (!foundUser.isVerified)
                        return reject('You need to verify your account before you can log in. Check your email for the link.')
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
                    this.findUserByEmail(userData.userName)
                        .then((foundUser) => {
                            if (foundUser) {
                                if (!foundUser.isVerified)
                                    return reject('You need to verify your account before you can log in. Check your email for the link.')
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
