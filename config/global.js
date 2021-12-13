const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const crypto = require('crypto');
const fs = require('fs');
const uuidv4 = require('uuid').v4;
require('dotenv').config();

let smtpTransport = require('nodemailer-smtp-transport');
const salt = 'f844b09ff50c';

smtpTransport = nodemailer.createTransport(smtpTransport({
    service: process.env.SMTP_SERVICE,
    auth: {
       user: process.env.SMTP_AUTH_USER,
       pass: process.env.SMTP_AUTH_PASSWORD,
    }
}));

/**
 * Read html file content
 */
const readHTMLFile = function(path, callback) {
    fs.readFile(path, {encoding: 'utf-8'}, function (err, html) {
        if (err) {
           callback(err); 
           throw err;
            
        }
        else {
            callback(null, html);
        }
    });
};

/**
 * Send email
 */
exports.sendEmail = function (email, subject, templateFile, dynamicaParseObj, callback) {
	readHTMLFile(__dirname + '/../views/'+ templateFile, function(err, html) {
	    var template = handlebars.compile(html);
	    var htmlToSend = template(dynamicaParseObj);
	    var mailOptions = {
	        from: process.env.SMTP_AUTH_USER,
	        to : email,
	        subject : subject,
	        html : htmlToSend
	    };


	    smtpTransport.sendMail(mailOptions, function (err, response) {
	        if (err) {
	            return callback({
	            	status: false,
	            	error: err
	            });
	        }

	        return callback({
	        	status: true
	        });
	    });
	});
}

/**
 * One way password encrypt
 */
exports.encrypt = (password) => {
    return crypto.pbkdf2Sync(password, salt, 1000, 64, `sha512`).toString(`hex`);
}

/**
 * Get Random Guid 
 */
exports.getUid = () => {
	return uuidv4();
}