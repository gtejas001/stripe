const express = require('express');
const app = express();
const bodyParser = require('body-parser');
require('dotenv').config();
const DB = require('./DB/db');
const jwt = require('express-jwt');
const cors = require('cors');

const stripeCtrl = require('./controller/stripe'),
    authCtrl = require('./controller/auth'),
    userCtrl = require('./controller/users');

const permission = require("./middleware/permission.js");

// DB Configuration
DB.connection();

const jwtVerification = jwt({
    secret: process.env.JWT_SECRET,
    algorithms: ['HS256'],
});

app.use(cors({
    methods: ['GET','POST','DELETE','UPDATE','PUT','PATCH']
}));

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({'extended':'true'}));
app.use(bodyParser.json()); 

/*****************
 * AUTH APIs
 *****************/
app.post('/api/v1/auth/login', authCtrl.authLogin);
app.post('/api/v1/user/activation/:id', authCtrl.sendUserActivation);
app.post('/api/v1/user/set-password/:token', authCtrl.setPassword);


/****************
 * USERS APIs
 *****************/
app.post('/api/v1/users/create', jwtVerification, permission.isAdminAccess, userCtrl.createUser);
app.get('/api/v1/users/get', jwtVerification, permission.isAdminAccess, userCtrl.getUserList);


/*****************
 * STRIPE APIs
 *****************/

// admin
app.post('/api/v1/create/subscription/:id/:productId', jwtVerification, permission.isAdminAccess, stripeCtrl.createSubscriptions);
app.get('/api/v1/get/all/product', jwtVerification, permission.isAdminAccess, stripeCtrl.getAllProduct);
app.post('/api/v1/send/subscription/invitations/:id', jwtVerification, permission.isAdminAccess, stripeCtrl.sendSubscriptionInvitations);


// user module
app.post('/api/v1/create/payment-method-attach/:paymentMethodId', jwtVerification, permission.isUserAccess, stripeCtrl.attachPaymentMethod);
app.get('/api/v1/user/retrieve/payment-method', jwtVerification, permission.isUserAccess, stripeCtrl.getUserPaymentMethods);
app.post('/api/v1/update/billing-information/:paymentMethodId', jwtVerification, permission.isUserAccess, stripeCtrl.updateBillingInformation);


// user and admin both
app.get('/api/v1/user/retrieve-subscription', jwtVerification, permission.isUserAccess, stripeCtrl.getUserSubscriptions);
app.get('/api/v1/admin/retrieve-subscription/:id', jwtVerification, permission.isAdminAccess, stripeCtrl.getAdminSubscriptions);
app.get('/api/v1/admin/all/retrieve-subscription', jwtVerification, permission.isAdminAccess, stripeCtrl.getAdminAllSubscriptions);
app.get('/api/v1/cancel/subscription/:subscriptionId', jwtVerification, permission.isAdminAndUserBothAccess, stripeCtrl.cancelSubscriptions);



// ACH stuff ony user
app.post('/api/v1/create-bank-account', jwtVerification, permission.isUserAccess, stripeCtrl.createBankAccount);
app.post('/api/v1/verify-bank-account/:sourceId', jwtVerification, permission.isUserAccess, stripeCtrl.verifyBankAccount);
app.post('/api/v1/create-charge/:sourceId', jwtVerification, permission.isUserAccess, stripeCtrl.createCharges);



/****************
 * Error Handling
 *****************/
app.use(function (err, req, res, next) {
    console.log(err)
    if (err.name === 'UnauthorizedError') {
        res.status(401).send('Unauthorized');
    }
});

app.listen(3000, '192.168.0.145', function() {
    console.log("Server running on port 3000");
});