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

//post new recipe to database
router.post("/creating-new-recipe", (req, res) => {
  var { recipeTitle, ingredientsList, instructionsList, imageInput } = req.body;
  if (!Array.isArray(ingredientsList))
    ingredientsList = [ingredientsList].flat();
  if (!Array.isArray(instructionsList))
    instructionsList = [instructionsList].flat();
  const userId = req.user.id;
  // Insert new recipe into recipes table
  db.run('INSERT INTO recipes (Title, Instructions, Image_Name, Cleaned_Ingredients, user_id) VALUES (?,?,?,?,?)', [recipeTitle, instructionsList.join("\n"), imageInput, "['" + ingredientsList.join("', '") + "']", userId], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Internal Server Error');
    }
    else {
      db.get("SELECT COUNT(*) AS count FROM recipes;", (err, recipe_id) => {
        if (err) {
          return res.status(500).send('Internal Server Error');
        } else {
          res.redirect('/recipe/' + recipe_id.count);
        }
      });
    };
  });
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