const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const passportJWT = require('passport-jwt');
const { check, validationResult } = require('express-validator');
const database = require('./database.js')
const userService = require('./user-service.js');

const HTTP_PORT = process.env.PORT || 8080;
var app = express();

// Set up the JWT strategy for authentication
var ExtractJwt = passportJWT.ExtractJwt;
var JwtStrategy = passportJWT.Strategy;
var jwtOptions = {};
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme('jwt');
jwtOptions.secretOrKey = '0Y^@gUsS8ON2oM4Vnmk%SbQ9P6LqUIaM%A2m0o85j#3j#i*yMh&Ol1d';
var strategy = new JwtStrategy(jwtOptions, (jwt_payload, next) => {
    console.log('Payload received', jwt_payload);
    if (jwt_payload) {
        next(null, {
            userId: jwt_payload.userId,
            userName: jwt_payload.userName,
            email: jwt_payload.email
        });
    }
    else {
        next(null, false);
    }
});

// Make passport use the strategy set up previously and initialize
passport.use(strategy);
app.use(passport.initialize());

app.use(cors());
app.use(bodyParser.json());

// User routes
// Example route to see protection of a route using JWT, will be removed
app.get('/api/users', (req, res) => {
    userService.getAllUsers().then((msg) => {
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
        .custom((value) => {
            return userService.findUserByEmail(value).then((foundUsers) => {
                if (foundUsers.length != 0) {
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
        .isLength({ max: 15 }).withMessage('Username is too long')
        .custom((value) => {
            return userService.findUserByUsername(value).then((foundUsers) => {
                if (foundUsers.length != 0) {
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
    userService.registerUser(req.body).then((msg) => {
        res.json({"message": msg});
    })
    .catch((msg) => {
        res.status(422).json({"message": msg});
    });
});

app.post('/api/login', (req, res) => {
    userService.checkUser(req.body).then((user) => {
        var payload = {
            userId: user.userId,
            userName: user.userName,
            email: user.email
        };
        var token = jwt.sign(payload, jwtOptions.secretOrKey);
        res.json({ "message": "Successfully logged in as user: " + user.userName, "token": token });
    }).catch((msg) => {
        res.status(422).json({ "message": msg });
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
})
