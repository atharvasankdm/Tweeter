const express = require("express");
const passport = require("passport");
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", passport.authenticate("local"), authController.login);
router.get("/logout", authMiddleware.isAuthenticated, authController.logout);
router.get("/temp", authMiddleware.isAuthenticated, (req, res) => {
  res.json("siuu");
});

module.exports = router;
