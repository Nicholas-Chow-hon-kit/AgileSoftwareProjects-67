const express = require('express');
const app = express();
const session = require('express-session');
const port = 3000;
const path = require('path');
const SQLiteStore = require('connect-sqlite3')(session);
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const csv = require('csv-parser');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const flash = require('express-flash')
const ejs = require('ejs');



// Create a SQLite database connection
global.db = new sqlite3.Database('./database.db', function (err) {
  if (err) {
    console.error(err);
    process.exit(1); // Bail out if unable to connect to the DB
  } else {
    console.log("Database connected");
    db.run("PRAGMA foreign_keys=ON"); // Enable foreign key constraints
  }
});

// Express middleware for parsing incoming form data
app.use(express.urlencoded({ extended: true }));

// Construct a platform-independent path to your views directory
const viewsDir = path.join(__dirname, 'views');

// Serve static assets
app.use(express.static(path.join(__dirname, 'assets')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static('public'));

// Import the authentication module
const auth = require('./auth');

// Authentication middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('login');
}

// Only example of how to lock the pages if you are not logged in
//app.use('/author', isAuthenticated, authorRoutes);
//this will lock all the get and post request within author routes

//function to prevent logged in users to go back to the login page through url
function notAuthenticated(req, res, next) {// this should go on things like the login,register and landing routes
  if (req.isAuthenticated()) {
    return res.redirect('/home');//logged in homepage redirect
  }
  next()
}

//use flash for error messages
app.use(flash());

// Set up session middleware
app.use(
  session({
    store: new SQLiteStore({ db: 'sessions.db', dir: __dirname }), //store session in sqlitedb using connect-sqlite3
    secret: 'secret_key',
    resave: false,
    saveUninitialized: true,
  })
);

//use functions to set up basics and sessions
app.use(passport.initialize());
app.use(passport.session());


//separate routes for the website based on user
const userRoutes = require('./routes/user');
const landingRoutes = require('./routes/landing');
const registerRoute = require('./routes/register');
const loginRoute = require('./routes/login');
const settingsRoute = require('./routes/settings');

//set the app to use ejs for rendering
app.set('view engine', 'ejs');
app.set('views', viewsDir);

//this adds routes for readers
app.use('/user', isAuthenticated, userRoutes);
// Only authenticated users can access reader routes
// app.use('/reader', isAuthenticated, readerRoutes);

// unauthenticated users access landing routes
app.use('/landing', notAuthenticated, landingRoutes);

// this adds routes for user registration
app.use('/register', notAuthenticated, registerRoute);

// Add the login route to the app
app.use('/login', notAuthenticated, loginRoute);

// Generating a password for epicurious (default user for CSV injections into the table)
// Password for the default user stored into a variable for db insertion
const epiPassword = 'epipassword';

function insertDefaultUser(callback) {
  // Check if the user "Epicurious" already exists
  db.get('SELECT id FROM users WHERE username = ?', ['epicurious'], (err, user) => {
    if (err) {
      console.error('Error checking for existing user:', err);
    } else if (user) {
      console.log('Default user "Epicurious" already exists. Checking for recipes table...');
      callback(); // Call the callback function to proceed with the next step
    } else {
      // User doesn't exist, proceed to generate and insert the hashed password for the default user
      bcrypt.genSalt(10, (err, salt) => {
        if (err) {
          console.error('Error generating salt:', err);
        } else {
          bcrypt.hash(epiPassword, salt, (err, hash) => {
            if (err) {
              console.error('Error hashing password:', err);
            } else {
              // 'Hash' variable to insert password into the database
              const hashedPassword = hash;

              // insertion query for the default user
              const insertUserQuery = `
                INSERT INTO users (firstName, lastName, username, password)
                VALUES (?, ?, ?, ?);
              `;

              //insertion values for the default user
              const values = ['Epicurious', 'Website', 'epicurious', hashedPassword];

              db.run(insertUserQuery, values, (err) => {
                if (err) {
                  console.error('Error inserting user:', err);
                } else {
                  console.log('Default user "Epicurious" added successfully.');
                }
                callback(); // Call the callback function to proceed with the next step


              });
            }
          });
        }
      });
    }
  });
}

function insertCSVData() {
  // Check if the "recipes" table exists in the database
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='recipes';", (err, result) => {
    if (err) {
      console.error('Error checking for existing table:', err);
      return;
    }

    if (result) {
      // Check if the "recipes" table has any rows
      db.get("SELECT COUNT(*) AS count FROM recipes;", (rowCountErr, rowCountResult) => {
        if (rowCountErr) {
          console.error('Error checking row count:', rowCountErr);
          return;
        }

        if (rowCountResult.count > 0) {
          console.log('The "recipes" table already exists and has rows. Skipping data insertion.');
          console.log('The application is ready for launch.');
        } else {
          console.log("Please wait as we are downloading the data into the database...");
          // Read data from the CSV file and insert into the database
          fs.createReadStream('datasets/recipes.csv')
            .pipe(csv())
            .on('data', (row) => {
              const insertQuery = `
                INSERT INTO recipes (Title, Ingredients, Instructions, Image_Name, Cleaned_Ingredients, user_id)
                VALUES (?, ?, ?, ?, ?, ?);
              `;
              db.run(insertQuery, [row.Title, row.Ingredients, row.Instructions, row.Image_Name, row.Cleaned_Ingredients, 1], (err) => {
                if (err) {
                  console.error('Error inserting data:', err);
                }
              });
            })
            .on('end', () => {
              console.log('Data inserted from CSV into the database');
              console.log('The application is ready for launch.');

            });
        }
      });
    }
  });
}

// Call the functions sequentially(this must be done or it will load at the functions 
//at the same time which will cause some recipes to fail when connecting to default user)
insertDefaultUser(insertCSVData);

//to route recipe images to the ejs
app.get('/images/:imageName', isAuthenticated, (req, res) => {
  const imageName = req.params.imageName;
  const imagePath = path.join(__dirname, 'datasets', 'recipeImages', imageName);
  res.sendFile(imagePath);
});

//to route profile images to the ejs
app.get('/profileImages/:profileImageName', isAuthenticated, (req, res) => {
  const profileImageName = req.params.profileImageName;
  const profileImagePath = path.join(__dirname, 'datasets', 'profileImages', profileImageName);
  res.sendFile(profileImagePath);
});

//if you run into an error where the local host does not connect PLEASE clean and build the db
app.get('/recipe/:id', isAuthenticated, (req, res) => {
  const recipeId = req.params.id;
  const userId = req.user.id; // Assuming you have user data available through req.user

  db.get(`
    SELECT recipe.*, user.firstName, user.lastName
    FROM recipes AS recipe
    JOIN users AS user ON recipe.user_id = user.id
    WHERE recipe.id = ?;
  `, [recipeId], (err, recipe) => {
    if (err || !recipe) {
      console.error('Error fetching recipe:', err);
      res.render('error');
    } else {
      const cleanedIngredientsArray = recipe.Cleaned_Ingredients
        .slice(2, -2)
        .split("', '")
        .map((ingredient) => ingredient.trim());
      recipe.Cleaned_Ingredients = cleanedIngredientsArray;

      const instructionsArray = recipe.Instructions.split('\n');
      recipe.Instructions = instructionsArray;

      // Get existing comments and associated user names
      db.all(`
        SELECT user_comments.*, users.firstName, users.lastName
        FROM user_comments
        JOIN users ON user_comments.user_id = users.id
        WHERE user_comments.recipe_id = ?
        ORDER BY user_comments.posted_timestamp DESC;
      `, [recipeId], (err, comments) => {
        if (err) {
          next(err);
        } else {
          // Get the count of likes for the recipe
          db.get('SELECT COUNT(*) AS likes FROM user_likes WHERE recipe_id = ?', [recipeId], (err, likesResult) => {
            if (err) {
              console.error('Error fetching likes count:', err);
              res.render('error');
            } else {
              // Check if the user has already liked the recipe
              db.get('SELECT * FROM user_likes WHERE user_id = ? AND recipe_id = ?', [userId, recipeId], (err, existingLike) => {
                if (err) {
                  console.error('Error checking for existing like:', err);
                  res.render('error');
                } else {
                  const hasLiked = existingLike ? 1 : 0;
                  res.render('recipe', { recipe, comments, likes: likesResult.likes, hasLiked: hasLiked });
                }
              });
            }
          });
        }
      });
    }
  });
});

//recipe page like button
app.post('/recipe/:id/like', isAuthenticated, (req, res) => {
  const userId = req.user.id;
  const recipeId = req.params.id;

  // Check if the user has already liked the article
  db.get('SELECT * FROM user_likes WHERE user_id = ? AND recipe_id = ?', [userId, recipeId], (err, existingLike) => {
    if (err) {
      console.error('Error checking for existing like:', err);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      if (existingLike) {
        // User has already liked, remove the like
        db.run('DELETE FROM user_likes WHERE user_id = ? AND recipe_id = ?', [userId, recipeId], (err) => {
          if (err) {
            console.error('Error removing like:', err);
            res.status(500).json({ error: 'Internal server error' });
          } else {
            //liked status
            const hasLiked = existingLike !== null;
            // Get the updated number of likes
            db.get('SELECT COUNT(*) AS likes FROM user_likes WHERE recipe_id = ?', [recipeId], (err, result) => {
              if (err) {
                console.error('Error getting updated likes count:', err);
                res.status(500).json({ error: 'Internal server error' });
              } else {
                res.json({ likes: result.likes, hasLiked: hasLiked });
              }
            });
          }
        });
      } else {
        // User hasn't liked yet, add the like
        db.run('INSERT INTO user_likes (user_id, recipe_id) VALUES (?, ?)', [userId, recipeId], (err) => {
          if (err) {
            console.error('Error adding like:', err);
            res.status(500).json({ error: 'Internal server error' });
          } else {
            // Get the updated number of likes
            db.get('SELECT COUNT(*) AS likes FROM user_likes WHERE recipe_id = ?', [recipeId], (err, result) => {
              if (err) {
                console.error('Error getting updated likes count:', err);
                res.status(500).json({ error: 'Internal server error' });
              } else {
                res.json({ likes: result.likes });
              }
            });
          }
        });
      }
    }
  });
});

// insert new comment into db and refresh recipe page
app.post('/recipe/:id/commenting', isAuthenticated, (req, res) => {
  // get user ID from the session or authentication process
  const recipeId = req.params.id;//receipe id
  const userId = req.user.id; // user ID
  const newComment = req.body.new_comment;//new comment
  db.run('INSERT INTO user_comments (comment_content,user_id,recipe_id) VALUES (?,?,?)', [newComment, userId, recipeId], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Internal Server Error');
    }
    else {
      res.redirect('/recipe/' + recipeId);
    };
  });
});

//default page when opening the application
app.get('/', notAuthenticated, (req, res) => {
  res.render("landing");
});

//test recommendation engine(no point implementing not enough users to create an accurate recommendation)
// Function to calculate recipe recommendations based on user likes
function getRecipeRecommendations(userId, callback) {
  // Step 1: Get the recipe IDs liked by the target user
  db.all('SELECT recipe_id FROM user_likes WHERE user_id = ?', [userId], (err, likedRecipes) => {
    if (err) {
      console.error('Error fetching liked recipes:', err);
      return callback([]);
    }

    const likedRecipeIds = likedRecipes.map((row) => row.recipe_id);

    // Step 2: Find recipes liked by other users who liked similar recipes
    db.all(`
      SELECT DISTINCT r.*
      FROM user_likes ul
      JOIN recipes r ON ul.recipe_id = r.id
      WHERE ul.user_id != ? 
      AND ul.recipe_id NOT IN (${likedRecipeIds.join(',')})
      LIMIT 10; -- Limit the number of recommendations
    `, [userId], (err, recommendedRecipes) => {
      if (err) {
        console.error('Error fetching recommended recipes:', err);
        return callback([]);
      }

      callback(recommendedRecipes);
    });
  });
}

// Create an object to store loaded recipes based on recipe.id
const loadedRecipeIds = {};

// Function to add loaded recipe IDs to the object
function addLoadedRecipeIds(recipes) {
  recipes.forEach((recipe) => {
    loadedRecipeIds[recipe.id] = true;
  });
}



// Render home page
app.get('/home', isAuthenticated, (req, res) => {
  const limit = 5; // Number of recipes to load initially
  db.all(`SELECT id, Title, Instructions, Image_Name FROM recipes LIMIT ?;`, [limit], (err, recipes) => {
    if (err || !recipes) {
      console.error('Error fetching more recipes:', err);
      res.status(500).json({ error: 'Error fetching more recipes' });
    } else {
      // Filter out any duplicate recipe IDs
      const uniqueRecipes = recipes.filter((recipe) => !loadedRecipeIds[recipe.id]);

      // Function to fetch more unique recipes
      function fetchMoreUniqueRecipes(neededCount, loadedRecipes) {
        db.all(`SELECT id, Title, Instructions, Image_Name FROM recipes WHERE id NOT IN (${Object.keys(loadedRecipeIds).join(',')}) LIMIT ?;`, [neededCount], (err, additionalRecipes) => {
          if (err || !additionalRecipes) {
            console.error('Error fetching additional recipes:', err);
            res.status(500).json({ error: 'Error fetching additional recipes' });
          } else {
            // Add the loaded unique recipe IDs to the global object
            additionalRecipes.forEach((recipe) => {
              loadedRecipeIds[recipe.id] = true;
            });

            // Concatenate the additional recipes with the initially loaded unique recipes
            const allUniqueRecipes = loadedRecipes.concat(additionalRecipes);

            // Render the home page with all unique recipes
            res.render('reader-home', { recipes: allUniqueRecipes });
          }
        });
      }

      if (uniqueRecipes.length < limit) {
        // If there are not enough unique recipes, fetch more
        fetchMoreUniqueRecipes(limit - uniqueRecipes.length, uniqueRecipes);
      } else {
        // Add the initially loaded unique recipe IDs to the global array
        addLoadedRecipeIds(uniqueRecipes);

        // Render the home page with the initial unique recipes
        res.render('reader-home', { recipes: uniqueRecipes });
      }
    }
  });
});



// Route to load more recipes into the reader home
app.get('/load-more', isAuthenticated, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = 5; // Number of recipes to load per request
  const offset = (page - 1) * pageSize;

  // Fetch more recipes from the database
  db.all(`SELECT id, Title, Instructions, Image_Name FROM recipes LIMIT ${pageSize} OFFSET ${offset};`, (err, recipes) => {
    if (err || !recipes) {
      console.error('Error fetching more recipes:', err);
      console.log("Error fetching recipes");
      res.status(500).json({ error: 'Error fetching more recipes' });
    } else {
      // Filter out any duplicate recipe IDs
      const uniqueRecipes = recipes.filter((recipe) => !loadedRecipeIds[recipe.id]);

      // Calculate how many more unique recipes are needed to reach 5
      const neededUniqueRecipesCount = 5 - uniqueRecipes.length;

      if (neededUniqueRecipesCount > 0) {
        // Fetch additional unique recipes to make up the count
        db.all(`SELECT id, Title, Instructions, Image_Name FROM recipes WHERE id NOT IN (${Object.keys(loadedRecipeIds).join(',')}) LIMIT ${neededUniqueRecipesCount};`, (err, additionalRecipes) => {
          if (err || !additionalRecipes) {
            console.error('Error fetching additional recipes:', err);
            res.status(500).json({ error: 'Error fetching additional recipes' });
          } else {
            // Add the loaded unique recipe IDs to the global object
            additionalRecipes.forEach((recipe) => {
              loadedRecipeIds[recipe.id] = true;
            });

            // Concatenate the additional recipes with the unique recipes
            const allUniqueRecipes = uniqueRecipes.concat(additionalRecipes);

            // Send the unique recipes as the response
            res.json({ recipes: allUniqueRecipes });
          }
        });
      } else {
        // Add the loaded unique recipe IDs to the global object
        uniqueRecipes.forEach((recipe) => {
          loadedRecipeIds[recipe.id] = true;
        });

        // Send the unique recipes as the response
        res.json({ recipes: uniqueRecipes });
      }
    }
  });
});




// Render profile page
app.get('/profile', isAuthenticated, (req, res) => {
  const userId = req.user.id;

  // Fetch user profile data from the database based on the user ID
  db.get('SELECT * FROM users WHERE id = ?', [userId], (err, userProfile) => {
    if (err) {
      console.error('Error fetching user profile:', err);
      res.render('error');
    } else {
      // Fetch user's posts from the database based on the user ID (limited to 24)
      db.all('SELECT * FROM recipes WHERE user_id = ? ORDER BY id DESC LIMIT 24', [userId], (err, userPosts) => {
        if (err) {
          console.error('Error fetching user posts:', err);
          res.render('error');
        } else {
          // Fetch user's liked recipes from the database based on the user ID (limited to 24)
          db.all('SELECT recipes.* FROM recipes INNER JOIN user_likes ON recipes.id = user_likes.recipe_id WHERE user_likes.user_id = ? LIMIT 24', [userId], (err, likedRecipes) => {
            if (err) {
              console.error('Error fetching liked recipes:', err);
              res.status(500).json({ error: 'Error fetching liked recipes' });
            } else {
              // Debugging: Log the fetched data
              // console.log('User Profile:', userProfile);
              // console.log('User Posts:', userPosts);
              // console.log('Liked Recipes:', likedRecipes);

              // Render the profile template with fetched data
              res.render('profile', { userProfile, userPosts, likedRecipes }); // Pass likedRecipes to the template
            }
          });
        }
      });
    }
  });
});



app.get('/render-profile-card', isAuthenticated, (req, res) => {
  const recipe = req.query.recipe;
  res.render('profile-card', { recipe }); // Use the appropriate view name
});


//render create new recipe page
app.get('/create-new-recipe', isAuthenticated, (req, res) => {
  res.render("create-new-recipe")
});

//leaderboard ranked by total no. likes
app.get('/leaderboard', isAuthenticated, (req, res) => {
  db.all('SELECT id,Title,Image_Name FROM recipes ORDER BY Total_Likes DESC LIMIT 10;', (err, recipes) => {
    if (err || !recipes) {
      console.error('Error fetching recipes:', err);
      res.render('error');
    } else {
      res.render("leaderboard", { recipes });
    }
  });
});


app.get('/render-home-card', isAuthenticated, (req, res) => {
  const recipe = req.query.recipe;
  res.render('home-card', { recipe }); // Use the appropriate view name
});


//likes db
app.get('/leaderboard', isAuthenticated, (req, res) => {
  db.all('SELECT recipes.*, COUNT(user_likes.id) AS likes_count FROM recipes LEFT JOIN user_likes ON recipes.id = user_likes.recipe_id GROUP BY recipes.id', (err, recipes) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Internal Server Error');
    }
    res.render('leaderboard', { recipes });
  }); 
});

app.post('/likes-content/:id', isAuthenticated, (req, res) => {
  const recipeId = req.params.id;
  // get user ID from the session or authentication process
  const userId = 1; // replace with the actual user ID

  db.run('INSERT INTO user_likes (user_id, recipe_id) VALUES (?, ?)', [userId, recipeId], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Internal Server Error');
    }
    res.redirect('/leaderboard');
  });
});



// Function to add loaded recipe IDs to the global array for search results
function addLoadedSearchRecipeIds(recipes) {
  recipes.forEach((recipe) => {
    loadedSearchRecipeIds[recipe.id] = true;
  });
}


// Search route
app.get('/search', isAuthenticated, (req, res) => {
  const searchQuery = req.query.query;

  // Clear the array for search results when performing a new search
  loadedSearchRecipeIds = {};

  // Store the search query in a session or as a cookie
  req.session.searchQuery = searchQuery;

  // Sample SQL query (you should adapt this to your database structure):
  db.all('SELECT * FROM recipes WHERE Title LIKE ? LIMIT 5', [`%${searchQuery}%`], (err, searchResults) => {
    if (err) {
      console.error('Error searching for recipes:', err);
      res.render('error');
    } else {
      // Add the initially loaded recipe IDs for search results to the global array
      addLoadedSearchRecipeIds(searchResults);

      // Render a search results page with the matching recipes
      res.render('search-results', { searchResults });
    }
  });
});


// Route to load more search results
app.get('/load-more-queries', isAuthenticated, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = 5; // Number of queries to load per request
  const offset = (page - 1) * pageSize;

  // Retrieve the search query from the session or cookie
  const searchQuery = req.session.searchQuery || '';

  // Fetch more search results from the database
  db.all(`SELECT id, Title, Instructions, Image_Name FROM recipes WHERE Title LIKE ? LIMIT ${pageSize} OFFSET ${offset};`, [`%${searchQuery}%`], (err, recipes) => {
    if (err || !recipes) {
      console.error('Error fetching more recipes queries:', err);
      res.status(500).json({ error: 'Error fetching more recipes queries' });
    } else {
      // Filter out any duplicate recipe IDs for search results
      const uniqueSearchRecipes = recipes.filter((recipe) => !loadedSearchRecipeIds[recipe.id]);

      // Calculate how many more unique recipes are needed to reach 5
      const neededUniqueSearchRecipesCount = 5 - uniqueSearchRecipes.length;

      if (neededUniqueSearchRecipesCount > 0) {
        // Fetch additional unique recipes for search results to make up the count
        db.all(`SELECT id, Title, Instructions, Image_Name FROM recipes WHERE Title LIKE ? AND id NOT IN (${Object.keys(loadedSearchRecipeIds).join(',')}) LIMIT ${neededUniqueSearchRecipesCount};`, [`%${searchQuery}%`], (err, additionalSearchRecipes) => {
          if (err || !additionalSearchRecipes) {
            console.error('Error fetching additional recipes queries:', err);
            res.status(500).json({ error: 'Error fetching additional recipes queries' });
          } else {
            // Add the loaded unique recipe IDs for search results to the global array
            addLoadedSearchRecipeIds(additionalSearchRecipes);

            // Concatenate the additional search recipes with the unique search recipes
            const allUniqueSearchRecipes = uniqueSearchRecipes.concat(additionalSearchRecipes);

            // Send the unique search recipes as the response
            res.json({ recipes: allUniqueSearchRecipes });
          }
        });
      } else {
        // Add the loaded unique recipe IDs for search results to the global array
        addLoadedSearchRecipeIds(uniqueSearchRecipes);

        // Send the unique search recipes as the response
        res.json({ recipes: uniqueSearchRecipes });
        console.log(loadedSearchRecipeIds)
      }
    }
  });
});




function getCategoryColumnName(categoryName) {
  switch (categoryName) {
    case 'Chicken':
      return 'Is_Chicken';
    case 'Beef':
      return 'Is_Beef';
    case 'Pork':
      return 'Is_Pork';
    case 'Seafood':
      return 'Is_Seafood';
    case 'Vegetarian':
      return 'Is_Vegetarian';
    default:
      return null; // Invalid category name
  }
};

//Selecting based on categories 

//add loaded recipe ID for category results
function addLoadedCategoryRecipeIds(recipes) {
  recipes.forEach((recipe) => {
    loadedCategoryRecipeIds[recipe.id] = true;
  });
}


//category route 
app.get('/category/:categoryName', isAuthenticated, (req, res) => {
  const categoryName = req.params.categoryName;

  // Clear the array for category results when switching categories
  loadedCategoryRecipeIds = {};

  const categoryColumnName = getCategoryColumnName(categoryName);
  const query = `SELECT * FROM recipes WHERE ${categoryColumnName} = 1 LIMIT 5`;

  db.all(query, (err, categoryResults) => {
    if (err) {
      console.error(`Error fetching ${categoryName} recipes:`, err);
      res.render('error');
    } else {
      console.log("error");
      // Add the initially loaded recipe IDs for category results to the global array
      addLoadedCategoryRecipeIds(categoryResults);

      // Render a category page with the matching recipes
      res.render('category-results', { categoryResults: categoryResults });
    }
  });
});

app.get('/load-more-category-recipes/:categoryName', isAuthenticated, (req, res) => {
  const categoryName = req.params.categoryName;
  const page = parseInt(req.query.page) || 1;
  const pageSize = 5;
  const offset = (page - 1) * pageSize;

  const categoryColumnName = getCategoryColumnName(categoryName);
  const query = `SELECT id, Title, Instructions, Image_Name FROM recipes WHERE ${categoryColumnName} = 1 LIMIT ${pageSize} OFFSET ${offset}`;

  db.all(query, (err, recipes) => {
    if (err || !recipes) {
      console.error(`Error fetching more ${categoryName} recipes:`, err);
      res.status(500).json({ error: `Error fetching more ${categoryName} recipes` });
    } else {
      const uniqueCategoryRecipes = recipes.filter((recipe) => !loadedCategoryRecipeIds[recipe.id]);

      const neededUniqueCategoryRecipesCount = 5 - uniqueCategoryRecipes.length;

      if (neededUniqueCategoryRecipesCount > 0) {
        db.all(`SELECT id, Title, Instructions, Image_Name FROM recipes WHERE ${categoryColumnName} = 1 AND id NOT IN (${Object.keys(loadedCategoryRecipeIds).join(',')}) LIMIT ${neededUniqueCategoryRecipesCount};`, (err, additionalCategoryRecipes) => {
          if (err || !additionalCategoryRecipes) {
            console.error(`Error fetching additional ${categoryName} recipes:`, err);
            res.status(500).json({ error: `Error fetching additional ${categoryName} recipes` });
          } else {
            addLoadedCategoryRecipeIds(additionalCategoryRecipes);

            const allUniqueCategoryRecipes = uniqueCategoryRecipes.concat(additionalCategoryRecipes);

            res.json({ recipes: allUniqueCategoryRecipes });
          }
        });
      } else {
        addLoadedCategoryRecipeIds(uniqueCategoryRecipes);

        res.json({ recipes: uniqueCategoryRecipes });
        console.log(loadedCategoryRecipeIds);
      }
    }
  });
});




//Render settings page
app.get('/settings', isAuthenticated, (req, res) => {
  const userId = req.user.id;
  db.get('SELECT * FROM users WHERE id = ?', [userId], (err, userProfile) => {
    if (err) {
      console.error('Error fetching user profile:', err);
      res.render('error');
    } else {
      res.render('settings', { userProfile }); // Pass the userProfile data to the template
    }
  });
});

// Handle the form submission to update user settings
app.post('/update-settings', isAuthenticated, (req, res, next) => {
  // Get values from the request body
  const { firstName, lastName, username, bio } = req.body;
  const userId = req.user.id;

  // Use the obtained values in the database update query
  global.db.run(
    'UPDATE users SET firstName = ?, lastName = ?, username = ?, bio = ? WHERE id = ?',
    [firstName, lastName, username, bio, userId],
    function (err) {
      if (err) {
        next(err);
      } else {
        res.redirect('/settings');
      }
    }
  );
});

//Route to delete account
app.post('/delete-account', (req, res) => {
  const userId = req.user.id;
  db.run('DELETE FROM users WHERE id = ?', [userId], (err) => {
    if (err) {
      console.error('Error deleting user account:', err);
      res.status(500).send('Internal Server Error');
    } else {
      console.log('Deleted account');
      req.logout(function (err) {
        if (err) {
          console.error('Error logging out:', err);
          res.status(500).send('Internal Server Error');
        } else {
          res.redirect('/landing');
        }
      });
    }
  });
});

// Start the server
app.listen(port, () => {
  console.log('App listening on port 3000');
});