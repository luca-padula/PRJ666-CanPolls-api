const jwt = require('jsonwebtoken');
const mailService = require('./mail-service.js');

const EventModel = require('./models/Event.js');
let Event = EventModel.Event;
const LocationModel = require('./models/Location.js');
let Location = LocationModel.Location;

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
        .then((event)=>{
            resolve(event);
        })
        .catch((err) =>{
            reject('An error occured');
        })
    });
}

module.exports.submitEvent = function(eventData){
    return new Promise((resolve, reject)=>{
        Event.create({
            event_title: eventData.event_title,
            event_description: eventData.event_description,
            date_from: eventData.date_from,
            date_to: eventData.date_to,
            time_from: eventData.time_from,
            time_to: eventData.time_to,
            location: Location.create({
                
            })
        })
    })
}