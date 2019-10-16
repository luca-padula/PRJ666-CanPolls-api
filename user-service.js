const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
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

module.exports.getUserById = function(uId) {
    return new Promise((resolve, reject) => {
        User.findOne({
            where: {
                userId: uId
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
/*
module.exports.updateUserInfo = function(userId, token) {
    return new Promise((resolve, reject) => {
        User.findOne({
            where: {
                userId: userId
            }
        })
            .then((foundUser) => {
                if ( !foundUser || foundUser.isVerified || (token != foundUser.verificationHash)) {
                    return reject('');
                }
                User.update({
                    isVerified: true
                }, {
                    where: { userId: foundUser.userId }
                })
                    .then(() => {
                        resolve('User ' + foundUser.userName + ' successfully updated');
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
*/
module.exports.registerUser = function(userData) {
    return new Promise((resolve, reject) => {
        bcrypt.hash(userData.password, 10)
            .then((hash) => {
                userData.password = hash;
                let randomString = crypto.randomBytes(32).toString('hex');
                let randomHash = bcrypt.hashSync(randomString, 10).replace('\/', '');
                userData.verificationHash = randomHash;
                User.create(userData)
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

module.exports.sendPasswordResetEmail = function(email) {
    return new Promise((resolve, reject) => {
        this.findUserByEmail(email)
            .then((foundUser) => {
                if (foundUser) {

                    // Set up JWT token that is valid for 1 hour
                    let payload = {
                        userId: foundUser.userId,
                        userName: foundUser.userName,
                        email: foundUser.email
                    };
                    let secret = foundUser.password + '-' + foundUser.createdAt;
                    let token = jwt.sign(payload, secret, {
                        expiresIn: 60 * 60
                    });

                    // Set up nodeMailer email configuration
                    let mailLink = mailService.appUrl + '\/resetPassword\/' + foundUser.userId +
                        '\/' + token;
                    let mailText = 'Hello ' + foundUser.firstName + ',\nAs per your request, ' +
                        'your password reset link is available below.\n' + mailLink + '\n' +
                        'This reset link will be valid for 1 hour, after which you will need to request another link.\n' +
                        'This link can only be used to reset your password once.';
                    let mailData = {
                        from: mailService.appFromEmailAddress,
                        to: foundUser.email,
                        subject: 'PRJ666 CanPolls Password Reset',
                        text: mailText
                    };

                    mailService.sendEmail(mailData)
                        .then(() => {
                            resolve();
                        })
                        .catch((msg) => {
                            console.log(msg);
                            reject('Error sending email');
                        });
                }
                else {
                    resolve();
                }
            })
            .catch((msg) => {
                console.log(msg);
                reject('Error finding user');
            });
    });
}

module.exports.resetPassword = function(id, token, passwordData) {
    return new Promise((resolve, reject) => {
        User.findOne({
            where: {
                userId: id
            }
        })
            .then((foundUser) => {
                if (!foundUser) {
                    return reject('Link id is wrong');
                }
                const secret = foundUser.password + '-' + foundUser.createdAt;
                return jwt.verify(token, secret);
            })
            .then((payload) => {
                if (payload.userId != id) {
                    console.log('bad token');
                    return reject('bad token');
                }
                return bcrypt.hashSync(passwordData.password, 10);
            })
            .then((hash) => {
                console.log(hash);
                return User.update({
                    password: hash
                }, {
                    where: { userId: id }
                });
            })
            .then((updatedUser) => {
                console.log('password updated!');
                resolve('password updated!');
            })
            .catch((err) => {
                console.log(err.message);
                reject(err.message);
            })
    });
}
