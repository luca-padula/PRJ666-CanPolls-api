const jwt = require('jsonwebtoken');
const Sequelize = require('sequelize');
const mailService = require('./mail-service.js');

const Op = Sequelize.Op;

const EventModel = require('./models/Event.js');
let Event = EventModel.Event;
const LocationModel = require('./models/Location.js');
let Location = LocationModel.Location;
const EventRegistrationModel = require('./models/EventRegistration.js');
let EventRegistration = EventRegistrationModel.EventRegistration;
const UserModel = require('./models/User.js');
let User = UserModel.User;

module.exports.getAllEvents = function(){
    return new Promise((resolve, reject) =>{
        Event.findAll({})
            .then((events)=>{
                resolve(events);
            })
            .catch((err) =>{
                reject('An error occured');
            });
    });
}

module.exports.getEventById = function(eId){
    return new Promise((resolve, reject)=>{
        Event.findOne({
            where:{event_id: eId}
        })
        .then((event) => {
            resolve(event);
        })
        .catch((err) => {
            console.log(err.message);
            reject('An error occured');
        })
    });
}

module.exports.submitEvent = function(eventData){
    return new Promise((resolve, reject)=>{
        Event.create(eventData)
            .then((createdEvent)=>{
                let mailLink = mailService.appUrl + '\/verifyEmail\/' + createdEvent.event_id;
                let mailText = 'Hello Admin,\nThere is new event just created. Here is the information: ' +
                    '\n Event Title: ' + createdEvent.event_title +
                    '\n Event Description: ' + createdEvent.event_description +
                    '\n Click here to approve the event. \n' + mailLink;
                let mailData = {
                    from: mailService.appFromEmailAddress,
                    to: 'amhnguyen@myseneca.ca',
                    subject: 'PRJ666 CanPolls Event Verification',
                    text: mailText
                };
                mailService.sendEmail(mailData)
                        .then(()=>resolve('Event ' + eventData.event_id + ' successfully submitted'))
                        .catch((msg) => reject('Error sending verification email'));
            })
            .catch((err) =>{
                reject('Couldnt submit event');
            })
        });
}

module.exports.getRegisteredUsersByEventId = function(eId) {
    return new Promise((resolve, reject) => {
        let foundUserIds = [];
        EventRegistration.findAll({
            attributes: ['UserUserId'],
            where: {
                EventEventId: eId
            }
        })
            .then((p_foundUserIds) => {
                for (var i = 0; i < p_foundUserIds.length; i++) {
                    foundUserIds.push(p_foundUserIds[i].UserUserId);
                }
                return User.findAll({
                    where: {
                        userId: {
                            [Op.in]: foundUserIds
                        }
                    }
                });
            })
            .then((registeredUsers) => {
                resolve(registeredUsers);
            })
            .catch((err) => {
                console.log(err);
                reject('error getting registered users');
            });
    });
}
