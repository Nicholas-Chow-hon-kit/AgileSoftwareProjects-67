
-- This makes sure that foreign_key constraints are observed and that errors will be thrown for violations
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS recipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  Title TEXT,
  Ingredients TEXT,
  Instructions TEXT,
  Image_Name TEXT,
  Cleaned_Ingredients TEXT,
  user_id INTEGER, -- id to connect recipes to the user
  FOREIGN KEY (user_id) REFERENCES users(id) -- Foreign key relationship with users
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    username TEXT NOT NULL,
    bio TEXT,
    password TEXT NOT NULL,
    profile_image_Name TEXT DEFAULT 'default_avatar',
    posts INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_likes (
    likes_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    recipe_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (recipe_id) REFERENCES recipes(id)
);

CREATE TABLE IF NOT EXISTS user_comments (
    comments_id INTEGER PRIMARY KEY AUTOINCREMENT,
    comment_content TEXT NOT NULL,
    posted_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER,
    recipe_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (recipe_id) REFERENCES recipes(id)
);

-- Create a trigger that updates the 'posts' column when a new recipe is inserted
CREATE TRIGGER IF NOT EXISTS update_posts_on_insert
AFTER INSERT ON recipes
FOR EACH ROW
BEGIN
  UPDATE users
  SET posts = posts + 1
  WHERE users.id = NEW.user_id;
END;

-- Create a trigger that updates the 'posts' column when a recipe is deleted
CREATE TRIGGER IF NOT EXISTS update_posts_on_delete
AFTER DELETE ON recipes
FOR EACH ROW
BEGIN
  UPDATE users
  SET posts = posts - 1
  WHERE users.id = OLD.user_id;
END;
