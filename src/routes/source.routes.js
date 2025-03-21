const express = require('express');
const router = express.Router();
const { getSources, createSource } = require('../controllers/source.controller');

router.get('/', getSources);
router.post('/', createSource);

module.exports = router;
