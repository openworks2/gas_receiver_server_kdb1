const express = require('express');
const router = express.Router();
const receiver = require('./lib/receiver');
const schedule = require('node-schedule');

const moment = require('moment');
require('moment-timezone');
moment.tz.setDefault('Asia/Seoul');

receiver.initFindByOnSensor();
receiver.findBygas();
setInterval(() => {
    receiver.findBygas();
}, 30000);

router.post('/test', (req, res, next) => {
    var reqBody = req.body[0];

    console.log(reqBody);

    res.status(200).end();
});

router.post('/status/iaq700', (req, res, next) => {
    var reqBody = req.body[0];
    var date = moment().format('YYYY-MM-DD HH:mm:ss.SSS');
    reqBody['record_time'] = date;
    // console.log('reqBody>>', reqBody);
    receiver.receive(reqBody);

    res.status(200).end();
});

// const j = schedule.scheduleJob('0 50 13 * * *', function () {
//     // receiver.backupOfDay();
// });

module.exports = router;
