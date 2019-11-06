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
Events = function(){
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
            if (event)
                resolve(event);
            else
                reject('Event does not exist');
        })
        .catch((err) => {
            console.log(err.message);
            reject('An error occured');
        })
    });
}

module.exports.getAllEvents = function() {
    return new Promise((resolve, reject) => {
        Event.findAll({
            where:{isApproved:true}
        })
            .then((events) => {
                resolve(events);
            })
            .catch((err) => {
                reject('An error occured');
            });
    });
}

module.exports.createEvent = function(eventData){
    return new Promise((resolve, reject)=>{
        console.log(eventData.event_title);
        Event.create({
            event_title: eventData.event_title,
            event_description: eventData.event_description,
            date_from: eventData.date_from,
            date_to: eventData.date_to,
            time_from: eventData.time_from,
            time_to: eventData.time_to,
            attendee_limit: eventData.attendee_limit,
            isApproved: false,
            UserUserId: eventData.userId
        }), 
        Location.create({
            venue_name: eventData.venue_name,
            street_name: eventData.street_name,
            city: eventData.city,
            province: eventData.province,
            postal_code: eventData.postal_code
        })
            .then(()=>{
                Event.findAll({}).then((events)=>{

                    let mailLink = mailService.appUrl + '\/event\/' + events[events.length - 1].event_id;
                let mailText = 'Hello Admin,\nThere is new event just created.' +
                    '\n Click here to check ot the event. \n' + mailLink;
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
            .catch((err)=>{
                reject('Counldnt fine the event');
            })
                
            })
            .catch((err) =>{
                reject('Couldnt submit event');
            })
        });
}

module.exports.updateEventById = function(eId, uId, eventData) {
    return new Promise((resolve, reject) => {
        Event.update(eventData, {
            where: {
                [Op.and]: [{event_id: eId}, {UserUserId: uId}]
            }
        })
            .then(() => resolve('Event successfully updated'))
            .catch((err) => {
                console.log(err);
                reject('Error updating event');
            });
    });
}

module.exports.getLocationByEventId = function(eId) {
    return new Promise((resolve, reject) => {
        Location.findOne({
            where: {EventEventId: eId}
        })
            .then((location) => resolve(location))
            .catch((err) => {
                console.log(err);
                reject('Error getting location');
            });
    });
}

module.exports.updateLocationByEventId = function(eId, locationData) {
    return new Promise((resolve, reject) => {
        locationData.postal_code = locationData.postal_code.replace(/\s/g, '').toUpperCase();
        Location.update(locationData, {
            where: {EventEventId: eId}
        })
            .then(() => resolve('Location successfully updated'))
            .catch((err) => {
                console.log(err);
                reject('Error updating location');
            });
    });
}

module.exports.sendEventUpdateEmails = function(eId) {
    return new Promise((resolve, reject) => {
        this.getRegistrationsWithUsersByEventId(eId)
            .then((registrations) => {
                registrations.forEach((reg) => {
                    if (reg.status != 'removed') {
                        let mailLink = mailService.appUrl + '\/event\/' + eId + '\/edit';
                        let mailText = 'Hello ' + reg.User.firstName + ',\nAn event for which you are registered has been updated. ' +
                            'You can view the updated event at the link below.\n' + mailLink;
                        let mailData = {
                            from: mailService.appFromEmailAddress,
                            to: reg.User.email,
                            subject: 'PRJ666 Canpolls Event Update',
                            text: mailText
                        };
                        mailService.sendEmail(mailData);
                    }
                });
            })
            .catch((err) => {
                console.log(err);
                reject('Error getting registrations');
            });
    });
}

module.exports.getRegistrationsWithUsersByEventId = function(eId) {
    return new Promise((resolve, reject) => {
        EventRegistration.findAll({
            include: [User],
            where: { EventEventId: eId }
        })
            .then((registrations) => {
                resolve(registrations);
            })
            .catch((err) => {
                console.log(err);
                reject('Error getting registrations');
            });
    });
}

module.exports.removeUserFromEvent = function(eventId, userId, eventName) {
    return new Promise((resolve, reject) => {
        EventRegistration.update({
            status: 'removed'
        }, {
            where: {
                [Op.and]: [{EventEventId: eventId}, {UserUserId: userId}]
            }
        })
            .then((updatedRegistrations) => {
                if (updatedRegistrations[0] == 0) {
                    return reject('No such registration');
                }
                else {
                    return User.findOne({
                        where: { userId: userId }
                    });
                }
            })
            .then((foundUser) => {
                if (!foundUser) {
                    return reject("Invalid user");
                }
                let mailText = 'Hello, ' + foundUser.firstName + '\n' +
                'The owner of event "' + eventName + '" has chosen to remove you from the event registration';
                let mailData = {
                    from: mailService.appFromEmailAddress,
                    to: foundUser.email,
                    subject: 'CanPolls Event ' + eventId,
                    text: mailText
                };
                return mailService.sendEmail(mailData);
            })
            .then(() => resolve('User successfully removed from event registration'))
            .catch((err) => {
                console.log(err);
                reject('Error removing user');
            });
    });
}

module.exports.approveEvent = function(event_id, data){
    return new Promise((resolve,reject)=>{
        Event.findOne( {
            where: {
                event_id: event_id
            }
        })
        .then((event)=>{
            if(!event){
                return reject('Link id is wrong');
            }
            console.log(data.isApproved);
            console.log(event.event_id);
            Event.update({
                isApproved: data.isApproved
            }, {
                where: {event_id: event.event_id}
            });
            console.log(event.isApproved); 
            User.findOne({
                where:{userId: event.UserUserId}
            })
            .then((foundUser)=>{
                console.log(foundUser.userId);
                let mailText;
                let mailLink = mailService.appUrl + '\/event\/' + event.event_id; 
                if(data.isApproved){
                    console.log(event.isApproved);
                    mailText = 'Hello,\nThis is an email to reply to your event.'+
                    '\nCongratulation! Your event has been approved by our presentative.'+
                    '\nHere is a link to your event.\n' + mailLink;
                }
                else{
                    mailText = 'Hello,\nThis is an email to reply to your event.'+
                        '\nWe are sorry to inform that your event has been declined by our presentative.';
                }
                let mailData = {
                    from: mailService.appFromEmailAddress,
                    to: foundUser.email,
                    subject: 'PRJ666 CanPolls Create Event',
                    text: mailText
                };
                mailService.sendEmail(mailData)
                    .then(()=>resolve('Event ' + event.event_title +'successfully updated'))
                    .catch((msg)=> reject('Error sending respond create event email'));
            })
            .catch((err)=>{
                reject('Counld not find user');
            })

        })
        .catch((err)=>{
            reject('Could not find event');
        })
        
    })
}

module.exports.getAllEventsByUser = function(userId){
    return new Promise((resolve, reject)=>{
        Event.findAll({
            where:{UserUserId: userId}
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