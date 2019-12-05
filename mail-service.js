const nodeMailer = require('nodemailer');

let transporter = nodeMailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    auth: {
        user: 'prj666_193a03@myseneca.ca',
        pass: 'KEpo25@nek'
    }
});

module.exports.appUrl = 'http://localhost:4200';

module.exports.appFromEmailAddress = 'prj666_193a03@myseneca.ca';

// This function takes an object containing a node-mailer email configuration and sends an email with the data
module.exports.sendEmail = function(data) {
    return new Promise((resolve, reject) => {
        transporter.sendMail(data, (err, info) => {
            if (err) {
                console.log(err);
                reject(err.message);
            }
            else
                resolve();
        });
    });
}
