require('dotenv').config()
const mariadb = require('mariadb');

/**
 * Creating MariaDB Pool
 */
const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    connectionLimit: 5
});

exports.getConnection = async() => await pool.getConnection();

/**
 * DB Connection Configuration
 * @returns 
 */
exports.connection = () => pool.getConnection()
    .then(conn => {
        console.log('Success DB');
        return conn;
    }).catch(err => {
        console.log('DB Failed');
        //not connected
        console.log(err)
    });
