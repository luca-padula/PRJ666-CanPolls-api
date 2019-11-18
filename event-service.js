const jwt = require('jsonwebtoken');
const Sequelize = require('sequelize');
const mailService = require('./mail-service.js');
const userService = require('./user-service.js');
const fs = require('fs');
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
        Event.create({
            event_title: eventData.event_title,
            event_description: eventData.event_description,
            photo: eventData.photo,
            date_from: eventData.date_from,
            date_to: eventData.date_to,
            time_from: eventData.time_from,
            time_to: eventData.time_to,
            attendee_limit: eventData.attendee_limit,
            isApproved: false,
            UserUserId: eventData.userId
        })
        .then(()=>{
                 Event.findAll({})
                 .then((events)=>{
                    // console.log("location entered: "+JSON.stringify(eventData));

                     Location.create({
                        venue_name: eventData.venue_name,
                        street_name: eventData.street_name,
                        city: eventData.city,
                        province: eventData.province,
                        postal_code: eventData.postal_code,
                        EventEventId: events[events.length - 1].event_id
                    })

                    resolve(userService.sendAdminEventDetails(eventData.userId,events[events.length - 1].event_id))
                 })
                 .catch((err)=>{
                    reject('Counldn\'t find the event');
                })
            
        })
        .catch((err) =>{
            reject('Couldn\'t submit event');
        })
    });
                /*
                
                Event.findAll({}).then((events)=>{

                    let mailLink = mailService.appUrl + '\/event\/' + events[events.length - 1].event_id;
                    console.log(mailLink);
                let mailText = 'Hello Admin,\nThere is new event just created.' +
                    '\n Click here to check out the event. \n' + mailLink;
                let mailData = {
                    from: mailService.appFromEmailAddress,
                    to: 'amhnguyen@myseneca.ca',
                    subject: 'PRJ666 CanPolls Event Verification',
                    text: mailText
                };
                 mailService.sendEmail(mailData)
                         .then(()=>resolve('Event ' + eventData.event_id + ' successfully submitted'))
                        .catch((msg) => reject('Error sending verification email'));*/
                        

}

module.exports.updateEventById = function(eId, uId, eventData) {
    // TO-DO: Send email to admin of corresponding party requesting approval after updating
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
                for (let i = 0; i < registrations.length; ++i) {
                    if (registrations[i].status == 'registered') {
                        let mailLink = mailService.appUrl + '\/event\/' + eId;
                        let mailText = 'Hello ' + registrations[i].User.firstName + ',\nAn event for which you are registered has been updated. ' +
                            'You can view the updated event at the link below.\n' + mailLink;
                        let mailData = {
                            from: mailService.appFromEmailAddress,
                            to: registrations[i].User.email,
                            subject: 'PRJ666 CanPolls Event Update',
                            text: mailText
                        };
                        mailService.sendEmail(mailData)
                            .then(() => console.log('Successfully sent event update email to user ' + registrations[i].User.userName))
                            .catch((err) => console.log('Failed to send event update email to user ' + registrations[i].User.userName, err));
                    }
                }
                return 'Sending event update emails';
            })
            .then((msg) => resolve(msg))
            .catch((err) => {
                console.log(err);
                reject(err);
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

module.exports.getRegistration = function(eventId, userId) {
    return new Promise((resolve, reject) => {
        EventRegistration.findOne({
            where: {
                [Op.and]: [{EventEventId: eventId}, {UserUserId: userId}]
            }
        })
            .then((registration) => resolve(registration))
            .catch((err) => {
                console.log(err);
                reject(err);
            });
    });
}

// This function returns all registrations (status is 'registered') for a given event id with a count of all rows returned
module.exports.getRegistrationsWithCount = function(eventId) {
    return new Promise((resolve, reject) => {
        EventRegistration.findAndCountAll({
            where: {
                status: 'registered'
            }
        })
            .then((result) => resolve(result))
            .catch((err) => {
                console.log(err);
                reject(err);
            });
    });
}

module.exports.registerUserForEvent = function(eventId, userId) {
    let theEvent;
    return new Promise((resolve, reject) => {
        this.getEventById(eventId)
            .then((event) => {
                theEvent = event
                let now = new Date();
                let registrationDeadline = new Date(theEvent.date_from + ' ' + theEvent.time_from);
                registrationDeadline.setHours(registrationDeadline.getHours() - 12);
                if (now < registrationDeadline)
                    return this.getRegistrationsWithCount(eventId);
                else
                    return Promise.reject('It is too late to register for this event');
            })
            .then((registrations) => {
                if (theEvent.attendee_limit != 0 && registrations.count >= theEvent.attendee_limit)
                    return Promise.reject('This event is already full');
                let alreadyRegistered = registrations.rows.find((reg) => reg.UserUserId == userId);
                if (alreadyRegistered)
                    return Promise.reject('You have already registered for this event');
                return userService.getUserById(userId);
            })
            .then((user) => {
                if (user)
                    return EventRegistration.create({
                        EventEventId: eventId,
                        UserUserId: userId
                    });
                else
                    return Promise.reject('Invalid user given for registration');
            })
            .then(() => resolve('You have successfully registered for this event'))
            .catch((err) => {
                console.log(err);
                reject(err);
            });
    });
}

module.exports.cancelRegistration = function(eventId, userId) {
    return new Promise((resolve, reject) => {
        this.getEventById(eventId)
            .then((event) => {
                let now = new Date();
                let registrationDeadline = new Date(event.date_from + ' ' + event.time_from);
                registrationDeadline.setHours(registrationDeadline.getHours() - 12);
                if (now >= registrationDeadline)
                    return Promise.reject('It is too late to cancel the registration');
                return EventRegistration.update({
                    status: 'cancelled'
                }, {
                    where: {
                        [Op.and]: [{ EventEventId: eventId }, { UserUserId: userId }, { status: 'registered' }]
                    }
                });
            })
            .then((updatedRegistrations) => {
                if (updatedRegistrations[0] == 0) {
                    return Promise.reject('No such registration, or you have already cancelled');
                }
                resolve('You have successfully cancelled your registration');
            })
            .catch((err) => {
                console.log(err);
                reject(err);
            });
    });
}

// This function sends an email to the owner of a given event id notifying them that
// a user has registered for their event
module.exports.sendEventRegistrationNoticeToOwner = function(eventId, updateType) {
    return new Promise((resolve, reject) => {
        let theEvent;
        this.getEventById(eventId)
            .then((event) => {
                theEvent = event;
                return userService.getUserById(event.UserUserId)
            })
            .then((user) => {
                if (user) {
                    let mailLink = mailService.appUrl + '\/event\/' + eventId + '\/edit';
                    let mailText = 'Hello ' + user.firstName + ',\nA user has ' + updateType
                        + ' for your event: "' + theEvent.event_title + '".\n'
                        + 'You can view all the registered users at the link below.\n' + mailLink;
                    let mailData = {
                        from: mailService.appFromEmailAddress,
                        to: user.email,
                        subject: 'PRJ666 CanPolls Event Update',
                        text: mailText
                    };
                    return mailService.sendEmail(mailData);
                }
                else
                    return reject('Invalid user to send email');
            })
            .then(() => resolve('Successfully sent registration update to event owner'))
            .catch((err) => {
                console.log(err);
                reject(err);
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
                    subject: 'PRJ666 CanPolls Event Notice',
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

module.exports.getEventsAttendedByUser = function(userId){
    return new Promise((resolve, reject)=>{
        EventRegistration.findAll({
            include: [Event],
            where:{UserUserId: userId}
        })
        .then((event) => {
           // console.log("Event Attended: "+JSON.stringify(event));
            resolve(event);
        })
        .catch((err) => {
            console.log(err.message);
            reject('An error occured');
        })
    });
}

module.exports.getAllEventsWithUser = function() {
    return new Promise((resolve, reject) => {
        Event.findAll({
            include: [User],
        })
            .then((events) => {
                resolve(events);
            })
            .catch((err) => {
                reject('An error occured');
            });
    });
}


module.exports.updateEventStatus = function(eventId, statusVal)
{
    return new Promise((resolve, reject) => {
    Event.findAll({
        include: [User],
    })
        .then((events) => {
            resolve(events);
        })
        .catch((err) => {
            reject('An error occured');
        });
});
}
