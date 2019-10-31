const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const { check, validationResult } = require('express-validator');
const database = require('./database.js')
const userService = require('./user-service.js');
const eventService = require('./event-service.js');
const passportConfig = require('./config/passportConfig.js');
const jwtConfig = require('./config/jwtConfig.js');

const HTTP_PORT = process.env.PORT || 8080;
var app = express();

app.use(passport.initialize());
app.use(cors());
app.use(bodyParser.json());
//passport.authenticate('jwt', {session: false}),
// User routes
// Example route to see protection of a route using JWT, will be removed
app.get('/api/users',  (req, res) => {
    userService.getAllUsers().then((msg) => {
        res.json({"message": msg});
    })
    .catch((msg) => {
        res.status(422).json({"message": msg});
    });
});

app.get('/api/users/:userId', (req, res) => {
    userService.getUserById(req.params.userId).then((msg) => {
        res.json(msg);
    })
    .catch((msg) => {
        res.status(422).json({"message": msg});
    });
});

app.get('/api/users/:userName', (req, res) => {
    userService.findUserByUsername(req.params.userName).then((msg) => {
        res.json(msg);
    })
    .catch((msg) => {
        res.status(422).json({"message": msg});
    });
});

app.put('/api/updateUser/:userId', [
    check('email')
        .isEmail().withMessage('Invalid email entered')
        .bail()
        .custom((value) => {
            return userService.findUserByEmail(value).then((foundUser) => {
                if (foundUser && !foundUser.email) {
                  return Promise.reject(foundUser.email+ ' Email is already registered');
                }
            })
            .catch((msg) => {
                return Promise.reject(msg);
            });
        }),
        check('firstName')
        .trim()//+*?^$()[/]{}]
        .not().matches(/[^a-zA-Z]/).withMessage('Firstname cannot contain anything but digits!')
        .bail(),
        check('lastName')
        .trim()//+*?^$()[/]{}]
        .not().matches(/[^a-zA-Z]/).withMessage('Lastname cannot contain anything but digits!')
        .bail(),
        check('userName')
        .trim()
        .not().isEmpty().withMessage('Username cannot be empty')
        .isLength({ max: 30 }).withMessage('Username is too long')
        .not().matches(/@/).withMessage('Invalid character entered for Username')
        .not().matches(/[ ]{2,}/).withMessage('Username cannot contain more than 1 consecutive whitespace')
        .bail()
        .custom((value) => {
            return userService.findUserByUsername(value).then((foundUser) => {
                if (foundUser && !foundUser.userName) {
                  return Promise.reject('Username already taken');
                }
            })
            .catch((msg) => {
                return Promise.reject(msg);
            });
        })
 ], (req, res) => {
    // Fail the request if there are validation errors and return them
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ "validationErrors": errors.array() });
    }
    userService.updateUserInfo(req.params.userId, req.body)
        .then((msg) => {
            console.log(msg);
            res.json({"message": msg});
        })
        .catch((msg) => {
            res.status(422).json({"message": msg});
        });
});

app.post('/api/register', [
    // Validate user input using express-validator
    check('email')
        .isEmail().withMessage('Invalid email entered')
        .bail()
        .custom((value) => {
            return userService.findUserByEmail(value).then((foundUser) => {
                if (foundUser) {
                    return Promise.reject('Email is already registered');
                }
            })
            .catch((msg) => {
                return Promise.reject(msg);
            });
        }),
    check('userName')
        .trim()
        .not().isEmpty().withMessage('Username cannot be empty')
        .isLength({ max: 30 }).withMessage('Username is too long')
        .not().matches(/@/).withMessage('Invalid character entered for Username')
        .not().matches(/[ ]{2,}/).withMessage('Username cannot contain more than 1 consecutive whitespace')
        .bail()
        .custom((value) => {
            return userService.findUserByUsername(value).then((foundUser) => {
                if (foundUser) {
                    return Promise.reject('Username already taken');
                }
            })
            .catch((msg) => {
                return Promise.reject(msg);
            });
        }),
    check('password')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
        .matches(/\d/).withMessage('Password must contain a number')
        .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
        .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter'),
    check('password2').custom((value, {req}) => {
        if (value !== req.body.password) {
            throw new Error('Passwords do not match');
        }
        return true;
    })
], (req, res) => {
    // Fail the request if there are validation errors and return them
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ "validationErrors": errors.array() });
    }
    userService.registerUser(req.body)
        .then((msg) => {
            res.json({"message": msg});
        })
        .catch((msg) => {
            res.status(500).json({"message": msg});
        });
});

app.post('/api/verifyEmail/:userId/:token', (req, res) => {
    userService.verifyUser(req.params.userId, req.params.token)
        .then((msg) => {
            res.json({"message": msg});
        })
        .catch((msg) => {
            res.status(422).json({"message": msg});
        });
});

app.post('/api/login', (req, res) => {
    userService.checkUser(req.body)
        .then((user) => {
            var payload = {
                userId: user.userId,
                userName: user.userName,
                email: user.email
            };
            var token = jwt.sign(payload, jwtConfig.secret);
            res.json({ "message": "Successfully logged in as user: " + user.userName, "token": token });
        })
        .catch((msg) => {
            res.status(400).json({ "message": msg });
        });
});

app.post('/api/forgotPassword', [
    check('email')
        .isEmail().withMessage('Invalid email entered')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ "message": errors.array()[0].msg });
    }
    userService.sendPasswordResetEmail(req.body.email)
        .then(() => res.json({ "message": "Password reset email successfully sent if user was found" }))
        .catch((msg) => res.status(500).json({ "message": msg }));
});

app.post('/api/resetPassword/:userId/:token', [
    check('password')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
        .matches(/\d/).withMessage('Password must contain a number')
        .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
        .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter'),
    check('password2').custom((value, {req}) => {
        if (value !== req.body.password) {
            throw new Error('Passwords do not match');
        }
        return true;
    })
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ "validationErrors": errors.array() });
    }
    userService.resetPassword(req.params.userId, req.params.token, req.body)
        .then((successMessage) => {
            res.json({ "message": successMessage });
        })
        .catch((errMessage) => {
            res.status(422).json({ "message": errMessage })
        });
});


// Event routes

app.post('/api/createEvent',[
    check('event_title')
        .trim()
        .not().isEmpty().withMessage('Event title cannot be empty')
        .isLength({max: 50}).withMessage('Event title is too long')
], (req, res) =>{
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(422).json({"validationErrors": errors.array()});
    }
    eventService.createEvent(req.body)
        .then((msg)=>{
            res.json({"message":msg});
        })
        .catch((msg)=>{
            res.status(422).json({"message": msg});
        });
});

app.get('/api/event/:event_id', (req, res) => {
    eventService.getEventById(req.params.event_id)
        .then((event) => {
            res.json(event);
        })
        .catch((err) => {
            res.status(422).json({ "message": err });
        });
});

app.post('/api/event/:event_id', passport.authenticate('general', {session: false}), [ check('userId')
.equals('27').withMessage('You are not authorized to approve this')
], (req, res)=>{
   const errors = validationResult(req);
   if (!errors.isEmpty()) {
    return res.status(422).json({ "validationErrors": errors.array() });
    }
    eventService.approveEvent(req.params.event_id, req.body)
    .then((successMessage) => {
        res.json({ "message": successMessage });
    })
    .catch((errMessage) => {
        res.status(422).json({ "message": errMessage })
    });
})

app.put('/api/event/:eventId', passport.authenticate('general', {session: false}), (req, res) => {
    eventService.getEventById(req.params.eventId)
        .then((foundEvent) => {
            if (!foundEvent || foundEvent.UserUserId != req.user.userId) {
                return Promise.reject('You are not authorized to edit this event');
            }
            else {
                return eventService.updateEventById(req.params.eventId, req.user.userId, req.body);
            }
        })
        .then((msg) => {
            res.json({ "message": msg });
        })
        .catch((err) => {
            res.status(500).json({ "message": err });
        });
});

app.get('/api/location/:eventId', (req, res) => {
    eventService.getLocationByEventId(req.params.eventId)
        .then((location) => {
            res.json(location);
        })
        .catch((err) => {
            res.status(500).json({ "message": err });
        });
});

app.put('/api/location/:eventId', passport.authenticate('general', {session: false}), (req, res) => {
    eventService.getEventById(req.params.eventId)
        .then((foundEvent) => {
            if (!foundEvent || foundEvent.UserUserId != req.user.userId) {
                return Promise.reject('You are not authorized to edit this location');
            }
            else {
                return eventService.updateLocationByEventId(req.params.eventId, req.body);
            }
        })
        .then((msg) => {
            res.json({ "message": msg });
        })
        .catch((err) => {
            res.status(500).json({ "message": err });
        });
});

app.get('/api/event/:eventId/registrations', passport.authenticate('general', {session: false}), (req, res) => {
    eventService.getEventById(req.params.eventId)
        .then((foundEvent) => {
            if (!foundEvent || foundEvent.UserUserId != req.user.userId) {
                return Promise.reject('You are not authorized to view this info');
            }
            else {
                return eventService.getRegistrationsByEventId(req.params.eventId);
            }
        })
        .then((registrations) => {
            res.json(registrations);
        })
        .catch((err) => {
            res.status(500).json({ "message": err });
        });
});

app.get('/api/event/:eventId/registeredUsers', passport.authenticate('general', {session: false}), (req, res) => {
    eventService.getEventById(req.params.eventId)
        .then((foundEvent) => {
            if (!foundEvent || foundEvent.UserUserId != req.user.userId) {
                return Promise.reject('You are not authorized to view this info');
            }
            else {
                return eventService.getRegisteredUsersByEventId(req.params.eventId)
            }
        })
        .then((registeredUsers) => {
            res.json(registeredUsers);
        })
        .catch((err) => {
            res.status(500).json({ "message": err });
        });
});

app.get('/api/events/createdEvents/:userId', (req, res) => {
    eventService.getAllEventsByUser(req.params.userId)
        .then((event) => {
            res.json(event);
        })
        .catch((err) => {
            res.status(422).json({ "message": err });
        });
});


app.delete('/api/event/:eventId/user/:userId', passport.authenticate('general', {session: false}), (req, res) => {
    eventService.getEventById(req.params.eventId)
        .then((foundEvent) => {
            if (!foundEvent || foundEvent.UserUserId != req.user.userId) {
                return Promise.reject('You are not authorized to do this');
            }
            else {
                return eventService.removeUserFromEvent(req.params.eventId, req.params.userId)
            }
        })
        .then((msg) => {
            res.json({ "message": msg });
        })
        .catch((err) => {
            res.status(500).json({ "message": err });
        });
});


// catch-all 404 route
app.use((req, res) => {
    res.status(404).send('404 code');
});

// connect to database and setup http server to listen on HTTP_PORT
database.initializeDatabase().then(() => {
    app.listen(HTTP_PORT, () => { console.log("API listening on: " + HTTP_PORT) });
})
.catch((err) => {
    console.log('Unable to start the server: ', err);
});
