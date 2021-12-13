const db = require('../DB/db'),
    jwt = require("jsonwebtoken"),
    stripeCtrl = require('./stripe'),
    configGlobal = require('../config/global');


/**
 * Admin Login function
 * 
 * @param {*} req 
 * @param {*} res 
 * @returns res 
 */
exports.authLogin = async (req, res) => {
    if(!req.body || !req.body.email || !req.body.password)
        return res.status(400).send("Invalid credentials");
    if(!req.body.email.length || !req.body.password.length)
        return res.status(400).send("Invalid credentials");

    const conn = await db.getConnection();
    conn.query(`SELECT * FROM admins WHERE (email=?) AND (password=?)`, [req.body.email, configGlobal.encrypt(req.body.password)]).then(data=>{
        if(data && data[0]) {
            const token = jwt.sign({
                first_name: data[0].first_name,
                lastName: data[0].last_name,
                email: data[0].email,
                id: data[0].id,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRE_TIME,
            });
            conn.release();
            return res.status(200).send({token: token, isAdmin: true});
        } else {

            conn.query(`SELECT * FROM users WHERE (isActive=?) AND (email=?) AND (password=?)`, [1, req.body.email, configGlobal.encrypt(req.body.password)]).then(data=>{
                if(data && data[0]) {
                    const token = jwt.sign({
                        first_name: data[0].first_name,
                        lastName: data[0].last_name,
                        email: data[0].email,
                        id: data[0].id,
                    },
                    process.env.JWT_SECRET,
                    {
                        expiresIn: process.env.JWT_EXPIRE_TIME,
                    });
                    conn.release();
                    return res.status(200).send({token: token, isAdmin: false});
                } else {
                    conn.release();
                    return res.status(400).send("Invalid credentials");
                }
            }, err => {
                conn.release();
                return res.status(400).send({error: "Invalid credentials"});
            });
        }
    }, err => {
        conn.release();
        return res.status(400).send({error: "Invalid credentials"});
    });
};

/**
 * Send user activation email function
 * 
 * @param {*} req 
 * @param {*} res 
 * @returns res 
 */
exports.sendUserActivation = async (req, res) => {

    if(!(req.params && req.params.id)) {
        return res.status(400).send("User Id must be required.");
    }

    const conn = await db.getConnection();
    conn.query(`SELECT * FROM users WHERE (id=?)`, [req.params.id]).then(data=>{
        if (!(data && data[0])) {
            conn.release();
            return res.status(419).send({error: "Invalid User Id"});
        }

        const genActivationToken = configGlobal.getUid();
        var sqlUpdate = "UPDATE users SET activationToken = '"+genActivationToken+"' WHERE email = '"+data[0].email+"'";

        conn.query(sqlUpdate).then(updateData => {
            configGlobal.sendEmail(data[0].email, 'User Activation', 'user-activation-email.html', {
                username: data[0].first_name +' '+ data[0].last_name,
                activationLink: process.env.USER_ACTIVATION_LINK +'?token='+genActivationToken
            }, function(response) {

                if (!(response.status)) {
                    conn.release();
                    return res.status(500).send({error: response.error});
                }

                conn.release();
                return res.status(200).send({message: 'Your Activation Email has been send successfully.'});
            });
        }, uErr => {
            conn.release();
            return res.status(200).send({error: uErr});
        });

    }, err => {
        conn.release();
        return res.status(200).send({error: err});
    });
};


/**
 * Set user password function
 * 
 * @param {*} req 
 * @param {*} res 
 * @returns res 
 */
exports.setPassword = async(req, res) => {
    if(!(req.params && req.params.token)) {
        return res.status(400).send("Token Expired.");
    }

    if(!(req.body && req.body.password)) {
        return res.status(400).send("Password must be required.");
    }

    if(!(req.body && req.body.confirmPassword)) {
        return res.status(400).send("confirmPassword must be required.");
    }

    if(req.body.password !== req.body.confirmPassword) {
        return res.status(400).send("Password & Confirm password do not same.");
    }

    
    const conn = await db.getConnection();
    conn.query(`SELECT * FROM users WHERE (activationToken=?)`, [req.params.token]).then(async data=>{
        if (!(data && data[0])) {
            conn.release();
            return res.status(419).send({error: "Expired Token"});
        }


        const csData = await stripeCtrl.createStripeCustomer(data[0].email);
        if (!csData) {
            conn.release();
            return res.status(500).send({error: "Oops! Something went wrong please try again later"});
        }

        var sqlUpdate = "UPDATE users SET isActive = 1, password = '"+ configGlobal.encrypt(req.body.password) +"', stripe_customer_id = '"+ csData.id +"' WHERE email = '"+data[0].email+"'";
        conn.query(sqlUpdate).then(updateData => {
            conn.release();
            return res.status(200).send({message: 'Your Activation is successfully.'});
        }, uErr => {
            conn.release();
            return res.status(200).send({error: uErr});
        });
    }, err => {
        conn.release();
        return res.status(200).send({error: err});
    });
}