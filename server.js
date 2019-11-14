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


// User routes

app.get('/api/users', (req, res) => {
    userService.getAllUsers().then((msg) => {
        res.json(msg);
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
    //var isEmailChanged=0;
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
        .not().matches(/[^a-zA-Z ]/).withMessage('Firstname cannot contain anything but letters!')
        .bail(),
        check('lastName')
        .trim()//+*?^$()[/]{}]
        .not().matches(/[^a-zA-Z ]/).withMessage('Lastname cannot contain anything but letters!')
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
            res.json( msg);
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
    check('password2')
        .custom((value, { req }) => {
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
                email: user.email,
                isAdmin: user.isAdmin,
                partyAffiliation: user.partyAffiliation
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
    check('password2')
        .custom((value, { req }) => {
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


app.put('/api/updatePassword/:userId' , [
                check('password')
                    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
                    .matches(/\d/).withMessage('Password must contain a number')
                    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
                    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter'),
                check('password2')
                    .custom((value, { req }) => {
                        if (value !== req.body.password) {
                            throw new Error('Passwords do not match');
                        }
                        return true;
                    })
            ], (req,res) => {  
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(422).json({ "validationErrors": errors.array() });
            }
            var newPass = JSON.stringify(req.body.password);
            userService.checkUser2(req.body.currentUser, req.body.curPass, newPass)
            .then((user) => {
                res.json({user});
            })
            .catch((msg) => {
                 res.status(400).json({ "message": msg });
            });
});

app.put('/api/deleteUser/:userId', (req,res) =>
{
    console.log("Req.params.userId: "+req.params.userId);
    console.log("Req.body: "+req.body);
    userService.deleteUser(req.params.userId)
    .then((msg) => {
        console.log(msg);
        res.json( msg);
    })
    .catch((msg) => {
        res.status(422).json({"message": msg});
    });
});


app.get('/api/usersByParty/:partyName', (req, res) => {
    console.log(req.params.partyName);
    userService.getAllUsersByParty(req.params.partyName).then((msg) => {
        res.json(msg);
    })
    .catch((msg) => {
        res.status(422).json({"message": msg});
    });
});



//ADMIN ROUTES

//UPDATING USER ACCOUNT STATUS  
app.put('/api/updateAccountStatus/:userId', (req, res) => {
        //console.log("Req.body.status: "+req.body.accountStatus);
        //console.log("Req.body.userId: "+req.body.userId);
    userService.updUserAccStatus(req.body.accountStatus, req.body.userId)
        .then((msg) => {
            console.log(msg);
            res.json( msg);
        })
        .catch((msg) => {
            res.status(422).json({"message": msg});
        });
});

//UPDATING USER affiliation STATUS  
app.put('/api/updateAffiliationStatus/:userId', (req, res) => {
   // console.log(req.body);
    userService.updUserAffStatus(req.body.affiliationApproved, req.body)
    .then((msg) => {
        console.log(msg);
        res.json( msg);
    })
    .catch((msg) => {
        res.status(422).json({"message": msg});
    });
});


//UPDATING EVENT STATUS
app.put('/api/updateEventStatus/:eventId',  (req,res) => 
{ 
    console.log("Eventid: "+req.params.eventId);
   // console.log("Event body : "+ JSON.stringify(req.body));
    eventService.approveEvent(req.params.eventId, req.body)
   
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

app.get('/api/events', (req, res) => {
    eventService.getAllEvents()
        .then((events) => {
            res.json(events);
        })
        .catch((err) => {
            res.status(422).json({ "message": err });
        });
});

app.get('/api/eventsUser', (req, res) => {
    eventService.getAllEventsWithUser()
        .then((events) => {
            res.json(events);
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

app.put('/api/event/:eventId', passport.authenticate('general', {session: false}), [
    check('event_title')
        .trim()
        .not().isEmpty().withMessage('Event title cannot be empty')
        .isLength({max: 80}).withMessage('Event title is too long'),
    check('event_description')
        .trim()
        .not().isEmpty().withMessage('Event description cannot be empty'),
    check('attendee_limit')
        .isNumeric()
        .custom((value, { req }) => {
            if (value < 0) {
                throw new Error('Invalid attendee limit entered');
            }
            return true;
        }),
    check('date_from')
        .isAfter().withMessage('You entered a start date that has already passed'),
    check('date_to')
        .custom((value, { req }) => {
            let start = new Date(req.body.date_from);
            let end = new Date(value);
            if (start >= end) {
                throw new Error('Invalid end date entered');
            }
            return true;
        })
], (req, res) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(422).json({"validationErrors": errors.array()});
    }
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
            eventService.sendEventUpdateEmails(req.params.eventId);
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

app.put('/api/location/:eventId', passport.authenticate('general', {session: false}), [
    check('venue_name')
        .trim()
        .not().isEmpty().withMessage('Venue name cannot be empty')
        .isLength({max: 100}).withMessage('Venue name is too long'),
    check('postal_code')
        .trim()
        .isPostalCode('CA').withMessage('Invalid postal code entered'),
    check('street_name')
        .trim()
        .not().isEmpty().withMessage('Street cannot be empty'),
    check('city')
        .trim()
        .not().isEmpty().withMessage('City cannot be empty')
], (req, res) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(422).json({"validationErrors": errors.array()});
    }
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
            eventService.sendEventUpdateEmails(req.params.eventId);
        })
        .catch((err) => {
            res.status(500).json({ "message": err });
        });
});

// This route returns all registrations for a given event with their associated user
app.get('/api/event/:eventId/registrationData', passport.authenticate('general', {session: false}), (req, res) => {
    eventService.getEventById(req.params.eventId)
        .then((foundEvent) => {
            if (!foundEvent || foundEvent.UserUserId != req.user.userId) {
                return Promise.reject('You are not authorized to view this info');
            }
            else {
                return eventService.getRegistrationsWithUsersByEventId(req.params.eventId)
            }
        })
        .then((registrations) => {
            res.json(registrations);
        })
        .catch((err) => {
            res.status(500).json({ "message": err });
        });
});

// This route returns a single registration for a specific event and user
app.get('/api/event/:eventId/registration/:userId', passport.authenticate('general', {session: false}), (req, res) => {
    eventService.getRegistration(req.params.eventId, req.params.userId)
        .then((registration) => res.json(registration))
        .catch((err) => res.status(500).json({ "message": err }));
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

// This route returns a count of all the registrations (registration status is not 'removed') for a given event id
app.get('/api/event/:eventId/registrationCount', passport.authenticate('general', {session: false}), (req, res) => {
    eventService.getRegistrationsWithCount(req.params.eventId)
        .then((result) => res.json(result.count))
        .catch((err) => {
            res.status(422).json({ "message": err });
        });
});

app.post('/api/event/:eventId/registerUser/:userId', passport.authenticate('general', {session: false}), (req, res) => {
    eventService.registerUserForEvent(req.params.eventId, req.params.userId)
        .then((msg) => {
            res.json({ "message": msg });
            eventService.sendEventRegistrationNoticeToOwner(req.params.eventId);
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
                return eventService.removeUserFromEvent(req.params.eventId, req.params.userId, foundEvent.event_title)
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
