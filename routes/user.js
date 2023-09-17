const express = require("express");
const router = express.Router();
const assert = require("assert");

//Get request for settings page template
router.get("/settings", (req, res) => {
  res.render("settings");
});

//get request for the create-new-recipe page for an article
router.get("/create-new-recipe", (req, res) => {
  res.render("create-new-recipe");
});

//get request for the create-new-recipe page for an article
router.get("/profile", (req, res) => {
  res.render("profile");
});

//logout request
router.post('/logout', (req, res, next) => {
  // Get the username of the logged out user
  const username = req.user.username;

  // Clear session data and set flash message
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    console.log(`User ${username} successfully logged out.`);
    res.redirect('/landing'); // Redirect to the landing page after logging out
  });
});

module.exports = router;