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

const fs =require('fs');
const HTTP_PORT = process.env.PORT || 8080;
var app = express();

app.use(passport.initialize());
app.use(cors());
app.use(bodyParser.json());


const path = require("path");
const multer = require("multer");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './images')
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
})
const upload = multer({
    storage: storage
})


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

app.get('/api/userToken/:userId', (req, res) => {
    userService.getUserTokenById(req.params.userId)
    .then((user) => {
        var payload = {
            userId: user.userId,
            userName: user.userName,
            email: user.email,
            isAdmin: user.isAdmin,
            partyAffiliation: user.partyAffiliation,
            affiliationApproved: user.affiliationApproved
        };
        var token = jwt.sign(payload, jwtConfig.secret);
        res.json({ "message": "user: " + user.userName, "token": token });
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
        .trim()
        .not().isEmpty().withMessage('First name cannot be empty')
        .isLength({ max: 50 }).withMessage('First name is too long')
        .not().matches(/[^a-zA-Z'\-]/).withMessage('First name may only contain alphabetic characters, apostrophe ( \' ), and hyphen ( \- )'),
    check('lastName')
        .trim()
        .not().isEmpty().withMessage('Last name cannot be empty')
        .isLength({ max: 50 }).withMessage('Last name is too long')
        .not().matches(/[^a-zA-Z'\-]/).withMessage('Last name may only contain alphabetic characters, apostrophe ( \' ), and hyphen ( \- )'),
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
        .not().matches(/@/).withMessage('Username cannot contain @ symbol')
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
        .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
        .bail()
        .custom((value, { req }) => {
            if (value !== req.body.password2) {
                throw new Error('Passwords do not match');
            }
            return true;
        }),
    check('firstName')
        .trim()
        .not().isEmpty().withMessage('First name cannot be empty')
        .isLength({ max: 50 }).withMessage('First name is too long')
        .not().matches(/[^a-zA-Z'\-]/).withMessage('First name may only contain alphabetic characters, apostrophe ( \' ), and hyphen ( \- )'),
    check('lastName')
        .trim()
        .not().isEmpty().withMessage('Last name cannot be empty')
        .isLength({ max: 50 }).withMessage('Last name is too long')
        .not().matches(/[^a-zA-Z'\-]/).withMessage('Last name may only contain alphabetic characters, apostrophe ( \' ), and hyphen ( \- )')
], (req, res) => {
    // Fail the request if there are validation errors and return them
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ "validationErrors": errors.array() });
    }
    userService.registerUser(req.body)
        .then((result) => {
            res.json({"message": result.msg}).end();
            return userService.sendAccountVerificationEmail(result.user);
        })
        .then((msg) => console.log(msg))
        .catch((err) => {
            if (!res.finished)
                res.status(500).json({"message": err});
        });
});

app.post('/api/resendVerificationEmail', (req, res) => {
    userService.resetVerificationHash(req.body.userName)
        .then((result) => {
            res.json({ "message": result.msg }).end();
            return userService.sendAccountVerificationEmail(result.user);
        })
        .then((msg) => console.log(msg))
        .catch((err) => {
            if (!res.finished)
                res.status(500).json({"message": err});
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
           // var newPass = JSON.stringify(req.body.password);
            //console.log("Newoass: "+newPass);
            //console.log("Newoass: "+req.body.password);
            userService.checkUser2(req.body.currentUser, req.body.curPass, req.body.password)
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
    check('userId')
    .custom((value) => {
        return userService.getUserById(value).then((userObj) => {

            if(userObj.affiliationApproved == false) {

              return Promise.reject('You have not been approved to create Events. Please wait for an administrator to verify you or email us at prj666_193a03@myseneca.ca to know further details');
            }
        })
        .catch((msg) => {
            console.log("catch msg");
            return Promise.reject(msg);
        });
    }),
    check('event_title')
        .trim()
        .isAscii().withMessage('Event Title cannot contain invalid character')
        .not().isEmpty().withMessage('Event title cannot be empty')
        .isLength({max: 100}).withMessage('Event title is too long'),
    check('attendee_limit')
        .isNumeric().withMessage('Invalid attendee limit entered')
        .bail()
        .custom((value, { req }) => {
            if (value < 0) {
                throw new Error('Invalid attendee limit entered');
            }
            return true;
        }),
    check('event_description')
        .trim()
        .isAscii().withMessage('Event Description cannot contain invalid character')
        .not().isEmpty().withMessage('Event Description cannot be empty')
        .isLength({max: 255}).withMessage('Event description cannot be more than 255 characters'),
    check('venue_name')
        .trim()
        .isAscii().withMessage('Venue Name cannot contain invalid character')
        .not().isEmpty().withMessage('Venue Name cannot be empty')
        .isLength({max: 100}).withMessage('Venue name cannot be more than 100 characters'),
    check('street_name')
        .isAscii().withMessage('Street Name cannot contain anything but letters and number!')
        .not().isEmpty().withMessage('Street Name cannot be empty')
        .isLength({max: 80}).withMessage('Street name cannot be more than 30 characters'),
    check('city')
        .trim()
        .not().isEmpty().withMessage('City cannot be empty')
        .bail()
        .isAscii().withMessage('Invalid characters entered for street name')
        .isLength({max: 30}).withMessage('City cannot be more than 30 characters'),
    check('province')
        .not().isEmpty().withMessage('Province cannot be empty'),    
    check('postal_code')
        .not().matches(/[^0-9a-zA-Z ]/).withMessage('Invalid Postal Code')
        .not().isEmpty().withMessage('Postal Code cannot be empty'),
    check('time_from')
        .not().isEmpty().withMessage('Start time cannot be empty'),
    check('time_to')
        .not().isEmpty().withMessage('End time cannot be empty'),
    check('date_from')
        .not().isEmpty().withMessage('Event Date cannot be empty')
        .custom((value, { req }) => {
            console.log("inside date from");
            var curDate = new Date().toISOString().slice(0,10);

            if(value <=curDate)
            {
                throw new Error('Invalid end date or time! Please do not enter todays\' date, passed date or uncoupled timings.');
            }

            console.log("checking start: "+req.body.date_from + ' ' + req.body.time_from+"\nend: "+req.body.date_from + ' ' + req.body.time_to);
            let start = new Date(req.body.date_from + ' ' + req.body.time_from);
            let end = new Date(req.body.date_from + ' ' + req.body.time_to);
            if (start >= end) {
                console.log("throwing error");
                throw new Error('Invalid end date or time! Please do not enter todays\' date, passed date or uncoupled timings.');
            }
            return true;
        })
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

app.get('/api/events/:getAll', (req, res) => {
    var getALL= req.params.getAll;
    console.log("getAll: "+getALL);
    eventService.getAllEvents(getALL)
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
        .bail()
        .isAscii().withMessage('Invalid characters entered for event title')
        .isLength({max: 100}).withMessage('Event title cannot be more than 100 characters'),
    check('event_description')
        .trim()
        .not().isEmpty().withMessage('Event description cannot be empty')
        .bail()
        .isAscii().withMessage('Invalid characters entered for event description')
        .isLength({max: 255}).withMessage('Event description cannot be more than 255 characters'),
    check('attendee_limit')
        .isNumeric().withMessage('Invalid attendee limit entered')
        .bail()
        .custom((value, { req }) => {
            if (value < 0 || value > 99999) {
                throw new Error('Please enter an attendee limit between 0 and 99,999');
            }
            return true;
        }),
    check('date_from')
        .custom((value, { req }) => {

            if (!value) {
                throw new Error('Invalid date entered');
            }
            console.log("checking start: "+req.body.date_from + ' ' + req.body.time_from+"\nend: "+req.body.date_from + ' ' + req.body.time_to);
            let start = new Date(value + ' ' + req.body.time_from);
            let end = new Date(value + ' ' + req.body.time_to);
            let curDate = new Date();
            if(start <= curDate) {
                throw new Error('Please enter a date and time that has not already passed');
            }
            if (start >= end) {
                throw new Error('Please enter an end time that is after the start time');
            }
            let twoYearsFromNow = curDate;
            twoYearsFromNow.setFullYear(curDate.getFullYear() + 2);
            if (start > twoYearsFromNow) {
                throw new Error('Please enter a start date and time that is less than 2 years away');
            }
            return true;
        })
], (req, res) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(422).json({"validationErrors": errors.array()});
    }
    let theEvent;
    eventService.getEventById(req.params.eventId)
        .then((foundEvent) => {
            theEvent = foundEvent;
            let now = new Date();
            let editDeadline = new Date(foundEvent.date_from + ' ' + foundEvent.time_from);
            if (!foundEvent || foundEvent.UserUserId != req.user.userId) {
                return Promise.reject('You are not authorized to edit this event');
            }
            else if ( now >= editDeadline) {
                return Promise.reject('It is too late to edit this event');
            }
            else if (foundEvent.status == 'C') {
                return Promise.reject('You cannot edit an event that has been cancelled');
            }
            else {
                return eventService.updateEventById(req.params.eventId, req.user.userId, req.body);
            }
        })
        .then((msg) => {
            res.json({ "message": msg }).end();
            return userService.sendAdminEventDetails(theEvent.UserUserId, theEvent.event_id);
        })
        .then(() => {
            console.log('Successfully sent approval request email to admin');
            return eventService.sendEventUpdateEmails(req.params.eventId);
        })
        .then((msg) => console.log(msg))
        .catch((err) => {
            if (!res.finished)
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
        .bail()
        .isAscii().withMessage('Invalid characters entered for venue name')
        .isLength({max: 100}).withMessage('Venue name cannot be more than 100 characters'),
    check('postal_code')
        .trim()
        .isPostalCode('CA').withMessage('Invalid postal code entered'),
    check('street_name')
        .trim()
        .not().isEmpty().withMessage('Street cannot be empty')
        .bail()
        .isAscii().withMessage('Invalid characters entered for street name')
        .isLength({max: 80}).withMessage('Street name cannot be more than 80 characters'),
    check('city')
        .trim()
        .not().isEmpty().withMessage('City cannot be empty')
        .bail()
        .isAscii().withMessage('Invalid characters entered for street name')
        .isLength({max: 30}).withMessage('City cannot be more than 30 characters')
], (req, res) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(422).json({"validationErrors": errors.array()});
    }
    let theEvent;
    eventService.getEventById(req.params.eventId)
        .then((foundEvent) => {
            theEvent = foundEvent;
            let now = new Date();
            let editDeadline = new Date(foundEvent.date_from + ' ' + foundEvent.time_from);
            if (!foundEvent || foundEvent.UserUserId != req.user.userId) {
                return Promise.reject('You are not authorized to edit this location');
            }
            else if ( now >= editDeadline) {
                return Promise.reject('It is too late to edit this location');
            }
            else if (foundEvent.status == 'C') {
                return Promise.reject('You cannot edit an event that has been cancelled');
            }
            else {
                return eventService.updateLocationByEventId(req.params.eventId, req.body);
            }
        })
        .then((msg) => {
            res.json({ "message": msg }).end();
            return userService.sendAdminEventDetails(theEvent.UserUserId, theEvent.event_id);
        })
        .then(() => {
            console.log('Successfully sent approval request email to admin');
            return eventService.sendEventUpdateEmails(req.params.eventId);
        })
        .then((msg) => console.log(msg))
        .catch((err) => {
            if (!res.finished)
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

app.get('/api/events/attendedByUser/:userId', (req, res) => {
    eventService.getEventsAttendedByUser(req.params.userId)
        .then((event) => {
            res.json(event);
        })
        .catch((err) => {
            res.status(422).json({ "message": err });
        });
});


// This route returns a count of all the registrations (registration status is 'registered') for a given event id
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
            res.json({ "message": msg }).end();
            return eventService.sendEventRegistrationNoticeToOwner(req.params.eventId, 'registered');
        })
        .then((msg) => console.log(msg))
        .catch((err) => {
            if (!res.finished)
                res.status(500).json({ "message": err });
        });
});

// This route removes a registered user from an event
app.delete('/api/event/:eventId/user/:userId', passport.authenticate('general', {session: false}), (req, res) => {
    eventService.getEventById(req.params.eventId)
        .then((foundEvent) => {
            if (!foundEvent || foundEvent.UserUserId != req.user.userId) {
                return Promise.reject('You are not authorized to do this');
            }
            else if (foundEvent.status == 'C') {
                return Promise.reject('You cannot remove users from a cancelled event');
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

app.delete('/api/event/:eventId/cancelRegistration/:userId', passport.authenticate('general', {session: false}), (req, res) => {
    if (req.user.userId != req.params.userId)
        return res.json({"message": 'You are not authorized to do this'});
    eventService.cancelRegistration(req.params.eventId, req.params.userId)
        .then((msg) => {
            res.json({ "message": msg }).end();
            return eventService.sendEventRegistrationNoticeToOwner(req.params.eventId, 'cancelled');
        })
        .then((msg) => console.log(msg))
        .catch((err) => {
            if (!res.finished)
                res.status(500).json({ "message": err });
        });
});

app.put('/api/event/:eventId/cancel', passport.authenticate('general', {session: false}), (req, res) => {
    let theEvent;
    let eventOwner;
    eventService.getEventById(req.params.eventId)
        .then((foundEvent) => {
            theEvent = foundEvent;
            let now = new Date();
            let eventStart = new Date(theEvent.date_from + ' ' + theEvent.time_from);
            if (now >= eventStart) {
                return Promise.reject('It is too late to cancel this event');
            }
            return userService.getUserById(theEvent.UserUserId);
        })
        .then((foundUser) => {
            eventOwner = foundUser;
            if (req.user.userId != theEvent.UserUserId && !(req.user.isAdmin && req.user.partyAffiliation == eventOwner.partyAffiliation)) {
                return Promise.reject('You are not authorized to cancel this event');
            }
            return eventService.cancelEvent(theEvent.event_id);
        })
        .then((msg) => {
            res.json({ "message": msg }).end();
            return eventService.sendEventCancellationNoticeToOwner(eventOwner, theEvent, req.body.reason);
        })
        .then((msg) => {
            console.log(msg);
            return eventService.sendEventCancellationEmails(theEvent, req.body.reason);
        })
        .then((msg) => console.log(msg))
        .catch((err) => {
            if (!res.finished)
                res.status(500).json({ "message": err });
        });
})

app.post('/api/createFeedback',[

],(req,res) =>{
    const errors = validationResult(req);
    console.log("here!!");
    if(!errors.isEmpty()){
        return res.status(422).json({"validationErrors": errors.array()});
    }
    eventService.createFeedback(req.body)
    .then((msg)=>{
        res.json({"message": msg});
    })
    .catch((msg)=>{
        res.status(422).json({"message": msg});
    });
})

app.get('/api/feedback/:eventId', (req,res)=>{
    eventService.getFeedbackByEventId(req.params.eventId)
    .then((feedback)=>{
        res.json(feedback);
        console.log(feedback);
    })
    .catch((err)=>{
        res.status(422).json({"message": err});
    });
});


app.post('/api/upload',  upload.single('file'), (req, res) => {
    //console.log("Req file: "+JSON.stringify(req.file));
    // the file is uploaded when this route is called with formdata.
    // now you can store the file name in the db if you want for further reference.
    const filename = req.file.filename;
    const path = req.file. path;
    // Call your database method here with filename and path
    res.json({'message': 'File uploaded'});
  });
  
app.get('/api/getimage/:imageName', function (req, res) {
      res.sendFile(__dirname +'/images/'+req.params.imageName);
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