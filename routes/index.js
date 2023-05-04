const express = require('express');

const router = express.Router();

router.get('/', async (req, res, next) => {
    try {
        res.json('Response!!');
    } catch (error) {
        console.error(error);
    }
});

module.exports = router;
