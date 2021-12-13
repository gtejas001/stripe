const db = require('../DB/db');

/**
 * Only Access Admin User
 */
exports.isAdminAccess = async (req,res,next) => {
    const conn = await db.getConnection();
    conn.query(`SELECT * FROM admins WHERE (id=?)`, [req.user.id]).then(data=>{
        if (!(data && data[0])) {
            conn.release();
            res.send(401, "Access Denied!");
        } else {
            conn.release();
            next();
        }
    });
}


/**
 * Only Access User
 */
exports.isUserAccess = async (req,res,next) => {
    const conn = await db.getConnection();
    conn.query(`SELECT * FROM users WHERE (id=?)`, [req.user.id]).then(data=>{
        if (!(data && data[0])) {
            conn.release();
            res.send(401, "Access Denied!");
        } else {
            conn.release();
            next();
        }
    });
}


/**
 * Admin & User Both Access
 */
exports.isAdminAndUserBothAccess = async (req,res,next) => {
    const conn = await db.getConnection();
    conn.query(`SELECT * FROM admins WHERE (id=?)`, [req.user.id]).then(data=>{
        if (!(data && data[0])) {
            conn.query(`SELECT * FROM users WHERE (id=?)`, [req.user.id]).then(data=>{
                if (!(data && data[0])) {
                    conn.release();
                    res.send(401, "Access Denied!");
                } else {
                    conn.release();
                    next();
                }
            });
        } else {
            conn.release();
            next();
        }
    });
}

