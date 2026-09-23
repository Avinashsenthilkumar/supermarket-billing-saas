const router = require("express").Router();
const c = require("../controllers/platformController");

router.get("/public", c.getPublicSettings);

module.exports = router;
