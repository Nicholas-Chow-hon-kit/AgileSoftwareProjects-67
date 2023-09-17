const express = require("express");
const router = express.Router();
const assert = require("assert");
// const recipes = require("./recipes");

/* const likeCount = 1; */
/*
router.get("/leaderboard", (req, res, next) => {

    global.db.all("SELECT title FROM recipes LIMIT 10 OFFSET 20", 
        function (err, rows) {
            if (err) {
                next(err);
            } else {
                res.json(rows);
        }
    })
    
    global.db.all("SELECT title, Image_Name FROM recipes LIMIT 10 OFFSET 20", 
        function (err, rows) {
            if (err) {
                next(err);
            } else {
                const titleRecipe = rows.map(row => row.Title);
                const Images = rows.map(row => row.Image_Name);

                res.render("leaderboard-content", {
                titleRecipe: titleRecipe,
                Images: Images

            }); 
        }
        }
    );
});



//since db has no id, title can become identifier

/*
router.get("/leaderboard/:title", (req, res, next) => {
    let title_leaderboard = req.params.title;

    global.db.all('SELECT * FROM recipes WHERE title = ?', [title_leaderboard], (err, recipe) => {
        if (err || !recipe) {
            console.error('Error fetching recipe:', err);
            res.render('error'); // Render an error template or message
        } else {
            console.log('Fetched recipe:', recipe);

             // Manually split the Cleaned_Ingredients string and trim each ingredient
            // Remove square brackets and split using single quotes as delimiters
            const cleanedIngredientsArray = recipe.Cleaned_Ingredients
            .slice(1, -1) // Remove square brackets
            .split("', '")
            .map((ingredient) => ingredient.trim()); // Trim any extra spaces

            recipe.Cleaned_Ingredients = cleanedIngredientsArray;
            // Split the instructions by newlines into an array
            const instructionsArray = recipe.Instructions.split('\n');
            recipe.Instructions = instructionsArray;

            res.render("recipe", {recipe} );
        }

        /
        })
    });


    

 



*/

module.exports = router; 
