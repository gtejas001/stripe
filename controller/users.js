const db = require('../DB/db');
const configGlobal = require('../config/global');




/**
 * Create user function
 * 
 * @param {*} req 
 * @param {*} res 
 * @returns res 
 */
exports.createUser = async (req, res) => {
    if(!req.body || !req.body.email || !req.body.first_name || !req.body.last_name) {
        return res.status(400).send("Invalid data");
    }
    
    const conn = await db.getConnection();
    const admin = req.user;

    conn.query(`SELECT * FROM admins WHERE (email=?)`, [req.body.email]).then(data=>{
        if(data && data[0]) {
            conn.release();
            return res.status(419).send({error: "Email must be unique"});
        }

        conn.query(`SELECT * FROM users WHERE (email=?)`, [req.body.email]).then(data=>{
            if(data && data[0]) {
                conn.release();
                return res.status(419).send({error: "Email must be unique"});
            } else {
                conn.query(`INSERT INTO users SET first_name = ?, last_name = ?, email = ?, created_by = ?`, [req.body.first_name, req.body.last_name, req.body.email, admin.id]).then(data => {
                    if(data) {
                        conn.release();
                        return res.status(200).send({data: "Successfully user added"});
                    } else {
                        conn.release();
                        return res.status(500).send({error: "Oops! Something went wrong please try again later"});
                    }
                })
            }
        }, err => {
            conn.release();
            return res.status(400).send("Invalid credentials");
        });
    });

};


/**
 * Get all user list function
 * 
 * @param {*} req 
 * @param {*} res 
 * @returns res 
 */
exports.getUserList = async (req, res) => {
    const conn = await db.getConnection();
    conn.query('SELECT * FROM users').then(data=>{

        if (!(data && data.length)) {
            conn.release();
            return res.status(500).send({error: "User data not found"});
        }

        conn.release();
        return res.status(200).send({data : data});

    }, err => {
        conn.release();
        return res.status(200).send({error: err});
    });
};