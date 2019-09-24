const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const database = require('./database.js')
const userService = require('./user-service.js');

const HTTP_PORT = process.env.PORT || 8080;
var app = express();
app.use(cors());
app.use(bodyParser.json());

// routes

app.post('/api/register', (req, res) => {
    userService.registerUser(req.body).then(function(msg) {
        res.json({"message": msg});
    })
    .catch(function(msg) {
        res.status(422).json({"message": msg});
    });
});

app.post('/api/login', (req, res) => {
    userService.checkUser(req.body).then(function(user) {
        res.json({ "message": "Successfully logged in as user: " + user.userName });
    }).catch(function(msg) {
        res.status(422).json({ "message": msg });
    });
});

// catch-all 404 route
app.use((req, res) => {
    res.status(404).send('404 code');
});

// connect to database and setup http server to listen on HTTP_PORT
database.initializeDatabase().then(function() {
    app.listen(HTTP_PORT, () => { console.log("API listening on: " + HTTP_PORT) });
})
.catch(function(err) {
    console.log('Unable to start the server: ', err);
})
