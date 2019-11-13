const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mailService = require('./mail-service.js');

// Import user model
const UserModel = require('./models/User.js');
let User = UserModel.User;


module.exports.getAllUsers = function() {
    return new Promise((resolve, reject) => {
        User.findAll({})
            .then((users) => {
                resolve(users);
            })
            .catch((err) => {
                console.log(err);
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
            reject('Error getting user');
        })
    });
}

module.exports.updateUserInfo = function(userId, userData) {
    return new Promise((resolve, reject) => {
        var emailChanged = 0;
        User.findOne({
            where: {
                userId: userId
            }
        })
            .then((foundUser) => {
                console.log(foundUser);
                if ( !foundUser || !foundUser.isVerified) {
                    return reject('User not found or Email not verified!');
                }
                if(userData.email != foundUser.email)
                {
                            emailChanged = 1;
                            let mailLink = mailService.appUrl + '\/verifyEmail\/' + foundUser.userId +
                                '\/' + foundUser.verificationHash;
                            let mailText = 'Hello ' + foundUser.firstName + ',\nthank you for registering with Canpolls. ' +
                                'Please click the link below to verify your account.\n' + mailLink;
                            let mailData = {
                                from: mailService.appFromEmailAddress,
                                to: foundUser.email,
                                subject: 'PRJ666 Canpolls Account Verification',
                                text: mailText
                            };
                            mailService.sendEmail(mailData);
                            User.update({
                                isVerified: false
                            }, {
                                where: { userId: foundUser.userId }
                            }) 
                }
                User.update(userData, {
                    where: { userId: foundUser.userId }
                })
                    .then(() => {
                            var finalMessage = 'User '+ foundUser.userName + ' successfully updated.';
                            if(emailChanged == 1)
                            {
                                finalMessage+= ' You have changed your email address. Please verify the new address.';
                            }
                        resolve(finalMessage);
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

module.exports.registerUser = function(userData) {
    return new Promise((resolve, reject) => {
        bcrypt.hash(userData.password, 10)
            .then((hash) => {
                userData.password = hash;
                let randomString = crypto.randomBytes(32).toString('hex');
                let randomHash = bcrypt.hashSync(randomString, 10).replace(/\//g, '');
                userData.verificationHash = randomHash;
                return User.create(userData);
            })
            .then((createdUser) => {
                let mailLink = mailService.appUrl + '\/verifyEmail\/' + createdUser.userId +
                    '\/' + createdUser.verificationHash;
                let mailText = 'Hello ' + createdUser.firstName + ',\nthank you for registering with Canpolls. ' +
                    'Please click the link below to verify your account.\n' + mailLink;
                let mailData = {
                    from: mailService.appFromEmailAddress,
                    to: createdUser.email,
                    subject: 'PRJ666 Canpolls Account Verification',
                    text: mailText
                };
                return mailService.sendEmail(mailData);
            })
            .then(() => resolve('User ' + userData.userName + ' successfully registered'))
            .catch((msg) => reject(msg));
    });
}

// This function accepts a user's id and a verification string sent in the request url.
// It checks the database for a user with the corresponding id. If the user is found,
// they are not verified, and the token matches their verification hash, it updates
// their verification status in the database.
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
        let foundUser;
        this.findUserByUsername(userData.userName)
            .then((result) => {
                if (result) {
                    foundUser = result;
                    return true;
                }
                else {
                    return this.findUserByEmail(userData.userName);
                }
            })
            .then((foundByEmail) => {
                if (!foundUser) {
                    if (foundByEmail) {
                        foundUser = foundByEmail;
                    }
                    else {
                        return reject('Incorrect email, username, or password entered');
                    }
                }
                if (!foundUser.isVerified) {
                    return reject('You need to verify your account before you can log in. Check your email for the link.')
                }
                return bcrypt.compare(userData.password, foundUser.password);
            })
            .then((passwordsMatch) => {
                if (passwordsMatch) {
                    resolve(foundUser);
                }
                else {
                    reject('Incorrect email, username, or password entered');
                }
            })
            .catch((err) => {
                reject(err);
            });
    });
}

// This function accepts an email address and sends an email to it with a link to reset the account
// registered with that email address.
// It checks the database for a user with the corresponding email address and, if the user is found,
// it generates a JWT that is valid for 1 hour or one use to use in the link and sends the email.
module.exports.sendPasswordResetEmail = function(email) {
    return new Promise((resolve, reject) => {
        this.findUserByEmail(email)
            .then((foundUser) => {
                if (foundUser) {
                    let payload = {
                        userId: foundUser.userId,
                        userName: foundUser.userName,
                        email: foundUser.email
                    };
                    let secret = foundUser.password + '-' + foundUser.createdAt;
                    let token = jwt.sign(payload, secret, {
                        expiresIn: 60 * 60
                    });
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

// This function accepts a user's id, a JWT, and an object containing the user's new password and password confirmation.
// It checks the database for a user with the corresponding id. If the user is found, it verifies the JWT sent with the request.
// If the JWT is correct, it updates the user's password with their new password hash.
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


module.exports.updatePassword = function(id, password) {
    return new Promise((resolve, reject) => {
        bcrypt.hash(password, 10)
            .then((hash) => {
                console.log(hash);
                return User.update({
                    password: hash
                }, {
                    where: { userId: id }
                });
            })
            .then((updatedUser) => {
                resolve('password updated!');
            })
            .catch((err) => {
                console.log(err.message);
                reject(err.message);
            })
    });
}


module.exports.checkUser2 = function (userData, oldPassword, newPassword) {

    return new Promise((resolve, reject) => {
        bcrypt.compare(oldPassword, userData.password)
        
            .then((match) => {
                if (match) {
                    return this.updatePassword(userData.userId, newPassword)
                }
                else {
                    return reject('Incorrect current password entered.');
                }
            })
            .then(() => resolve())
            .catch((err) => {
                console.log(err);
                reject(err);
            })
    })
}


//ADMIN ROUTES

module.exports.updUserAccStatus = function(status, foundUserId)
{
    return new Promise((resolve, reject) => {
                //console.log(status+foundUserId);
                User.update({
                    accountStatus : status
                }, {
                    where: { userId: foundUserId }
                })
                .then(() => {
                        resolve('Status successfully changed');
                })
                .catch((err) => {
                        console.log(err);
                        reject('Error updating user');
                 });
            })
}