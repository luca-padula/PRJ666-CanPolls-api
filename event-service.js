const jwt = require('jsonwebtoken');
const Sequelize = require('sequelize');
const mailService = require('./mail-service.js');
const userService = require('./user-service.js');
const fs = require('fs');
const Op = Sequelize.Op;

const EventModel = require('./models/Event.js');
let Event = EventModel.Event;
const FeedbackModel = require('./models/Feedback.js');
let Feedback = FeedbackModel.Feedback;
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
            include: [
                {model: User},
                { model: Location} ,      
                ],
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

module.exports.getAllEvents = function(getAll) {

    if(getAll == "false")
    {
        return new Promise((resolve, reject) => {
            Event.findAll({
                include: [
                    {
                        model: User, 
                        where:{ partyAffiliation: { [Op.ne]: 'Unaffiliated' } }
                     },
                       { model: Location} ,      
                    ],
                where:{
                    status: 'A', 
                    date_from: { [Op.gt]: new Date().toISOString().slice(0,10) }
                }
            })
                .then((events) => {
                    //console.log(JSON.stringify(events));
                    resolve(events);
                })
                .catch((err) => {
                    reject(err+ 'An error occured');
                });
        });
    }
    else
    {
    return new Promise((resolve, reject) => {
        Event.findAll({
            include: [
                {
                    model: User, 
                    where:{ partyAffiliation: { [Op.ne]: 'Unaffiliated' } }
                 },
                   { model: Location} ,      
                ],
            where:{
                status: 'A'
            }
        })
            .then((events) => {
                resolve(events);
            })
            .catch((err) => {
                reject('An error occured');
            });
    });
    }
}

module.exports.createEvent = function(eventData){
    console.log(JSON.stringify(eventData));
    return new Promise((resolve, reject)=>{
        Event.create({
            event_title: eventData.event_title,
            event_description: eventData.event_description,
            photo: eventData.photo,
            date_from: eventData.date_from,
          //  date_to: eventData.date_to,
            time_from: eventData.time_from,
            time_to: eventData.time_to,
            attendee_limit: eventData.attendee_limit,
            status: 'P',
            UserUserId: eventData.userId
        })
        .then(()=>{
                 Event.findAll({})
                 .then((events)=>{
                     eventData.postal_code = eventData.postal_code.toUpperCase();
                     console.log("location entered: "+JSON.stringify(eventData));

                     Location.create({
                        venue_name: eventData.venue_name,
                        street_name: eventData.street_name,
                        city: eventData.city,
                        province: eventData.province,
                        postal_code: eventData.postal_code,
                        EventEventId: events[events.length - 1].event_id
                    })
                    console.log("prev name"+ eventData.photo);
                    var renameImageTo;
                    if(eventData.photo==""){
                        renameImageTo="notAvailable.jpg";
                    }else{
                        renameImageTo = events[events.length - 1].event_id + ""+eventData.photo;
                    }
                    Event.findOne({
                        where:{event_id: events[events.length - 1].event_id}
                    })
                    .then((foundEvent) => {
                        
                        Event.update(
                            {
                                photo : renameImageTo
                            },
                             {
                                where: { event_id: foundEvent.event_id}
                             })
                    })
                    .catch((err) => {
                        reject('An error occured');
                    });
                    
                    console.log("Reanme: "+renameImageTo);
                    fs.rename('images/'+eventData.photo, 'images/'+renameImageTo, function(err) {
                        if ( err ) console.log('ERROR: ' + err);
                    });
                    resolve(userService.sendAdminEventDetails(eventData.userId,events[events.length - 1].event_id))
                 })
                 .catch((err)=>{
                    reject('Counldn\'t find the event');
                })
            
        })
        .catch((err) =>{
            console.log(err);
            reject('Couldn\'t submit event');
        })
    });
}

// This function takes an event id, a user id, and an event object and updates the event
// with the new event data
module.exports.updateEventById = function(eId, uId, eventData) {
    return new Promise((resolve, reject) => {
        console.log("1stevdata.photo: "+eventData.photo);
        var renameImageTo = eId + ""+eventData.photo;
        console.log("Reanme: "+renameImageTo);
        fs.rename('images/'+eventData.photo, 'images/'+renameImageTo, function(err) {
            if ( err ) console.log('ERROR: ' + err);
        });
        eventData.photo = renameImageTo;
        console.log("evdata.photo: "+eventData.photo);
        eventData.status = 'P';
        Event.update(eventData, {
            where: {
                [Op.and]: [{event_id: eId}, {UserUserId: uId}]
            }
        })
            .then(() => resolve('Event successfully updated'))
            .catch((err) => {
                console.log(err);
                fs.unlinkSync(eventData.photo);
                reject('Error updating event');
            });
    });
}

// This function takes an event id and returns the corresponsing event
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

// This function takes an event id and a location object and updates the event's location
// with the new location data
module.exports.updateLocationByEventId = function(eId, locationData) {
    return new Promise((resolve, reject) => {
        locationData.postal_code = locationData.postal_code.replace(/\s/g, '').toUpperCase();
        Location.update(locationData, {
            where: {EventEventId: eId}
        })
            .then(() => {
                return Event.update({
                    status: 'P'
                }, {
                    where: {event_id: eId}
                });
            })
            .then(() => resolve('Location successfully updated'))
            .catch((err) => {
                console.log(err);
                reject('Error updating location');
            });
    });
}

// This function takes an event and sends emails to users registered for that event
// notifying them that it has been updated
module.exports.sendEventUpdateEmails = function(eId) {
    return new Promise((resolve, reject) => {
        this.getRegistrationsWithUsersByEventId(eId)
            .then((registrations) => {
                for (let i = 0; i < registrations.length; ++i) {
                    if (registrations[i].status == 'registered' && registrations[i].User.notificationsOn) {
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

// This function takes an event id and returns all registrations for that event, regardless of status,
// with the user object also included in each row
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

// This function takes an event id and a user id and returns the corresponding user's registration for that event
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
                [Op.and]: [{EventEventId: eventId}, {status: 'registered'}]
            }
        })
            .then((result) => resolve(result))
            .catch((err) => {
                console.log(err);
                reject(err);
            });
    });
}

// This function takes an event id and a user id and registers the corresponding user for that event
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
                    return this.getRegistrationsWithUsersByEventId(eventId);
                else
                    return Promise.reject('It is too late to register for this event');
            })
            .then((registrations) => {
                if (theEvent.attendee_limit != 0 && registrations.length >= theEvent.attendee_limit)
                    return Promise.reject('This event is already full');
                let regIdx = registrations.findIndex((reg) => reg.UserUserId == userId);
                if (regIdx != -1) {
                    let errorMsg;
                    if (registrations[regIdx].status == 'registered')
                        errorMsg = 'You are already registered for this event';
                    else if (registrations[regIdx].status == 'cancelled')
                        errorMsg = 'You cannot register for an event after cancelling';
                    else
                        errorMsg = 'You cannot register for an event after being removed';
                    return Promise.reject(errorMsg);
                }
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

// This function takes an event id and a user id and cancels the corresponding user's
// registration for that event
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

// This function takes an event id and cancels the event with that id
module.exports.cancelEvent = function(eventId) {
    return new Promise((resolve, reject) => {
        Event.update({
            status: 'C'
        }, {
            where: { event_id: eventId }
        })
            .then((updatedEvents) => {
                resolve('You have successfully cancelled your event');
            })
            .catch((err) => {
                console.log(err);
                reject(err);
            });
    });
}

// This function takes an event and sends emails to users registered for that event
// notifying them that it has been cancelled
module.exports.sendEventCancellationEmails = function(event, reason) {
    return new Promise((resolve, reject) => {
        this.getRegistrationsWithUsersByEventId(event.event_id)
            .then((registrations) => {
                for (let i = 0; i < registrations.length; ++i) {
                    if (registrations[i].status == 'registered' && registrations[i].User.notificationsOn) {
                        let mailLink = mailService.appUrl + '\/event\/' + event.event_id;
                        let mailText = 'Hello ' + registrations[i].User.firstName + ',\nThe following event for which you are registered has been cancelled:\n'
                            + '\"' + event.event_title + '\"\n'
                            + 'You can view the cancelled event at the link below:\n'
                            + mailLink + '\n'
                            + 'The reason for cancellation was:\n'
                            + '\"' + reason + '\"';
                        let mailData = {
                            from: mailService.appFromEmailAddress,
                            to: registrations[i].User.email,
                            subject: 'PRJ666 CanPolls Event Cancelled',
                            text: mailText
                        };                        
                        mailService.sendEmail(mailData)
                            .then(() => console.log('Successfully sent event cancellation email to user ' + registrations[i].User.userName))
                            .catch((err) => console.log('Failed to send event cancellation email to user ' + registrations[i].User.userName, err));
                    }
                }
                return 'Sending event cancellation emails';
            })
            .then((msg) => resolve(msg))
            .catch((err) => {
                console.log(err);
                reject(err);
            });
    });
}

// This function takes a user object, an event object, and a string and sends an email to the
// event owner notifying them that their event has been cancelled
module.exports.sendEventCancellationNoticeToOwner = function(eventOwner, event, reason) {
    return new Promise((resolve, reject) => {
        if (eventOwner.notificationsOn) {
            let mailLink = mailService.appUrl + '\/event\/' + event.event_id;
            let mailText = 'Hello ' + eventOwner.firstName + ',\n'
                + 'Your event has been cancelled:\n'
                + '\"' + event.event_title + '\"\n'
                + 'You can view the cancelled event at the link below but you will no longer be able to edit it:\n'
                + mailLink + '\n'
                + 'The reason for cancellation was:\n'
                + '\"' + reason + '\"';
            let mailData = {
                from: mailService.appFromEmailAddress,
                to: eventOwner.email,
                subject: 'PRJ666 CanPolls Event Cancelled',
                text: mailText
            };
            mailService.sendEmail(mailData)
                .then(() => console.log('Successfully sent event cancellation email to owner ' + eventOwner.userName))
                .catch((err) => console.log('Failed to send event cancellation email to owner ' + eventOwner.userName, err));
        }
        resolve('Sending event cancellation notice to owner');
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
                    console.log(user.notificationsOn);
                    if(user.notificationsOn == true)
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

// This function removes a registered user from an event
module.exports.removeUserFromEvent = function(eventId, userId, eventName) {
    return new Promise((resolve, reject) => {
        EventRegistration.update({
            status: 'removed'
        }, {
            where: {
                [Op.and]: [{EventEventId: eventId}, {UserUserId: userId}, {status: 'registered'}]
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

                if(foundUser.notificationsOn == true)
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
            console.log("Status: "+JSON.stringify(data.status));
            if(!event){
                return reject('Link id is wrong');
            }
            Event.update({
                status: data.status
            }, {
                where: {event_id: event.event_id}
            });
            User.findOne({
                where:{userId: event.UserUserId}
            })
            .then((foundUser)=>{
                let mailText;
                let mailLink = mailService.appUrl + '\/event\/' + event.event_id; 
                if(data.status == "A"){
                    mailText = 'Hello,\nThis is an email to reply to your event.'+
                    '\nCongratulations! Your event has been approved by the administrator of your party'+
                    '\nHere is a link to your event.\n' + mailLink;
                }
                else if (data.status == "C"){
                    mailText = 'Hello,\nThis is an email to reply to your event.'+
                    '\nWe are sorry to inform you that your event has been cancelled by the administrator of your party'+
                    '\nHere is a link to your event.\n' + mailLink;
                }
                else if(data.status == "D"){
                    
                    mailText = 'Hello,\nThis is an email to reply to your event.'+
                    '\nWe are sorry to inform you that your event has been declined by the administrator of your party.';
                        console.log("rej count: "+foundUser.rejectionCount)
                        if(foundUser.rejectionCount >=2)
                        {
                            mailText += '\n Seems like your submitted event has been declined a couple of times in past. '+
                            'Unfortunately, you have been banned from the website. Please contact '+mailService.appFromEmailAddress+' to know more details.\n';
                            User.update(
                                {
                                    accountStatus : 'B',
                                    notificationsOn : 1

                                },
                                 {
                                    where: { userId: foundUser.userId}
                                 })
                        }
                        else
                        {
                            foundUser.rejectionCount+=1;
                                User.update(
                                {
                                    rejectionCount : foundUser.rejectionCount
                                },
                                 {
                                    where: { userId: foundUser.userId}
                                 })

                        }

                }
              
                if(data.status != "P")
                {
                    let mailData = {
                        from: mailService.appFromEmailAddress,
                        to: foundUser.email,
                        subject: 'PRJ666 CanPolls Create Event',
                        text: mailText
                    };
                    console.log("notification: "+foundUser.notificationsOn);
                    if(foundUser.notificationsOn == true)
                    {
                        mailService.sendEmail(mailData)
                        .then(()=>resolve('Event ' + event.event_title +'successfully updated'))
                        .catch((msg)=> reject('Error sending respond create event email'));
                    }
                }
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
        Event.findAll({include: [User],
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

module.exports.createFeedback = function(feedback){
    return new Promise((resolve, reject)=>{
        console.log(feedback);
        Feedback.create({
            feedback_desc: feedback.feedback_desc,
            feedback_date: feedback.feedback_date,
            feedback_rating: feedback.feedback_rating,
            UserUserId: feedback.userUserId,
            EventEventId: feedback.eventEventId
        });
    })
    .then((createdFeedback) => {
        resolve(createdFeedback);
    })
    .catch((err) => {
        console.log(err);
        reject(err);
    });
}

module.exports.getFeedbackByEventId = function(eventid){
    return new Promise((resolve, reject)=>{
        console.log(eventid);
        Feedback.findAll({
            include: [User],
            where:{EventEventId:eventid}
        })
        .then((feedback)=>{
            resolve(feedback);
            console.log(feedback);
        })
        .catch((err)=>{
            console.log(err.message);
            reject('cannot get feedback');
        })
    });
}
