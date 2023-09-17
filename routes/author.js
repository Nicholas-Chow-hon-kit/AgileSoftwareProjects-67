const express = require("express");
const router = express.Router();
const assert = require("assert");

//author SETTINGS "GET" request to fill in the fields
router.get("/settings", (req, res) => {
  // Retrieve the current banner settings from the database
  global.db.get(
    "SELECT * FROM bannerSettings WHERE id = 1",
    function (err, bannerSettingsData) {
      if (err) {
        console.error(err);
      } else {
        // Render the settings.ejs template and pass the banner settings to it
        res.render("settings", { bannerSettingsData });
      }
    }
  );
});

//author SETTINGS "POST" request to update the fields
router.post("/settings", (req, res) => {
  const { banner_header, banner_subheader, author_name } = req.body;

  // Update the banner settings in the database
  global.db.run(
    "UPDATE bannerSettings SET banner_header = ?, banner_subheader = ?, author_name = ? WHERE id = 1",
    [banner_header, banner_subheader, author_name],
    function (err) {
      if (err) {
        console.error(err);
      } else {
        // Redirect back to the author home page
        res.redirect("/author/home");
      }
    }
  );
});

// Homepage Banner and article request
router.get("/home", (req, res) => {
  // query the bannerSettings table to get the data for the homepage banner
  global.db.get(
    "SELECT * FROM bannerSettings WHERE id = 1",
    (err, bannerSettingsData) => {
      if (err) {
        console.error(err);
      }

      //query the draftArticles table to get the draft articles
      global.db.all("SELECT * FROM draftArticles", (err, draftArticles) => {
        if (err) {
          console.error(err);
        }

        //query the publishedArticles table to get the published articles
        global.db.all(
          "SELECT * FROM publishedArticles",
          (err, publishedArticles) => {
            if (err) {
              console.error(err);
            }

            // Render the EJS template and pass all the data to it
            res.render("author-home", {
              bannerSettingsData,
              draftArticles,
              publishedArticles,
            });
          }
        );
      });
    }
  );
});

//get request for the create-new-draft page for an article
router.get("/create-new-draft", (req, res) => {
  const articleId = req.query.id; // Extract the articleId from query parameters

  global.db.get(
    //retreive banner settings data
    "SELECT * FROM bannerSettings WHERE id = 1",
    function (err, bannerSettingsData) {
      if (err) {
        console.error(err);
      } else {
        // Render the "create-new-draft.js" template with both the article data and the banner settings data
        res.render("create-new-draft", { bannerSettingsData });
      }
    }
  );
});

//post request to create a new draft article
router.post("/create-new-draft", (req, res) => {
  // Retrieve data from the form and destructuring object
  const { title, subtitle, body } = req.body;

  // Insert the new article into the draftArticles table
  global.db.run(
    "INSERT INTO draftArticles (title, subtitle, body) VALUES (?, ?, ?)",
    [title, subtitle, body],
    function (err) {
      if (err) {
        console.error(err);
      } else {
        // Redirect back to the "Author Homepage" page after successfully creating a new draft
        res.redirect("/author/home");
      }
    }
  );
});

//Get request for the editing page for an article
router.get("/article/edit", (req, res) => {
  const articleId = req.query.id; // Extract the articleId from query parameters

  //Retrieve the article from the draftArticle table based on the articleId
  global.db.get(
    "SELECT * FROM draftArticles WHERE id = ?",
    [articleId],
    function (err, articleData) {
      if (err) {
        console.error(err);
      }
      //Retrieve the banner settings data from the database
      global.db.get(
        "SELECT * FROM bannerSettings WHERE id = 1",
        function (err, bannerSettingsData) {
          if (err) {
            console.error(err);
          } else {
            //Render the "edit.js" template with both the banner settings data and the article data
            res.render("edit", { bannerSettingsData, articleData });
          }
        }
      );
    }
  );
});

//updating of the article after the post is edited in the article's editing page
router.post("/article/edit/:id", (req, res) => {
  const articleId = req.params.id; // Extract the articleId from query parameters
  const { title, subtitle, body } = req.body; //extract values from body and destructure

  global.db.run(
    "UPDATE draftArticles SET title = ?, subtitle = ?, body = ?, lastModified = (datetime('now','localtime'))  WHERE id = ?",
    [title, subtitle, body, articleId],
    function (err) {
      if (err) {
        console.error(err);
      } else {
      }
    }
  );
});

//Publishing a draft article in the Homepage through publish form button
router.post("/article/publish/:id", (req, res) => {
  const articleId = req.params.id; // Extract the articleId from query parameters

  // Retrieve the article data from the draftArticles table based on the articleId
  global.db.get(
    "SELECT * FROM draftArticles WHERE id = ?",
    [articleId],
    (err, articleData) => {
      if (err) {
        console.error(err);
      }

      // Insert the article data into the publishedArticles table
      global.db.run(
        "INSERT INTO publishedArticles (title, subtitle, body, created) VALUES (?, ?, ?, ?)",
        [
          articleData.title,
          articleData.subtitle,
          articleData.body,
          articleData.created,
        ],
        (err) => {
          if (err) {
            console.error(err);
          }

          // Delete the article data from the draftArticles table
          global.db.run(
            "DELETE FROM draftArticles WHERE id = ?",
            [articleId],
            (err) => {
              if (err) {
                console.error(err);
              }

              // Redirect back to the "Author Homepage" page
              res.redirect("/author/home");
            }
          );
        }
      );
    }
  );
});

// Deleting a draft article
router.post("/article/delete/:id", (req, res) => {
  const articleId = req.params.id; // Extract the articleId from query parameters

  // Delete the article from the draftArticles table based on the articleId
  global.db.run(
    "DELETE FROM draftArticles WHERE id = ?",
    [articleId],
    (err) => {
      if (err) {
        console.error(err);
      }

      // Redirect back to the home page
      res.redirect("/author/home");
    }
  );
});

// Deleting a published article
router.post("/publishedArticle/delete/:id", (req, res) => {
  const articleId = req.params.id; // Extract the articleId from query parameters

  // Delete comments related to the article first
  global.db.run(
    "DELETE FROM comments WHERE articleId = ?",
    [articleId],
    (err) => {
      if (err) {
        console.error(err);
      }

      // delete the article from the publishedArticles table based on the articleId
      global.db.run(
        "DELETE FROM publishedArticles WHERE id = ?",
        [articleId],
        (err) => {
          if (err) {
            console.error(err);
          }

          // Redirect back to the home page
          res.redirect("/author/home");
        }
      );
    }
  );
});


// Logout button to redirect back to reader homepage
router.get('/logout', function (req, res) {
  req.logout(function (err) {
    if (err) {
      console.error(err);
    }
    res.redirect('/reader/home');
  });
});

///////////////////////////////////////////////////////route export////////////////////////////////////////////////////////
module.exports = router;
