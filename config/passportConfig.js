const passport = require('passport');
const passportJWT = require('passport-jwt');
const jwtConfig = require('./jwtConfig.js');

// Set up the JWT strategy for general authentication
var ExtractJwt = passportJWT.ExtractJwt;
var JwtStrategy = passportJWT.Strategy;
var jwtOptions = {};
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme('jwt');
jwtOptions.secretOrKey = jwtConfig.secret;
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

passport.use('general', strategy);
