const mysql = require('mysql');

const env = process.env.NODE_ENV || 'development';

const config = require('./database.json')[env];
console.log(config);
//var conn = mysql.createConnection(dbconfig.operation);
//풀에서 컨넥션 생성
const pool = mysql.createPool(config);

module.exports = pool;
