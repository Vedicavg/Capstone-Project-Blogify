import express from "express";
import bodyParser from "body-parser";
import multer from "multer";
import mongoose from "mongoose";
import { dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config(); // This loads the .env file
// Set up Mongoose and MongoDB connection
const dbURI = process.env.MONGODB_URI;

mongoose.connect(dbURI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB', err));

const postSchema = new mongoose.Schema({
    postTitle: String,
    PostContent: String,
    Author: String,
    blogImageName: String
});

const Post = mongoose.model('Post', postSchema);

const __dirname = dirname(fileURLToPath(import.meta.url));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/data/uploads');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + file.originalname);
    }
});

const upload = multer({ storage: storage });

const app = express();
const port = 2000;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB operations to replace JSON file operations

// Function to find all posts
function findAllPosts() {
    return Post.find().exec();
}

// Function to add a new post
async function addPost(data) {
    const newPost = new Post({
        postTitle: data.postTitle,
        PostContent: data.PostContent,
        Author: data.Author,
        blogImageName: data.blogImageName
    });

    await newPost.save();
    return newPost;
}

// Function to delete a post
async function deletePost(postId) {
    const post = await Post.findById(postId).exec();
    if (post) {
        // Check if blogImageName exists before attempting to delete the image
        if (post.blogImageName) {
            const imgPath = `${__dirname}/public/data/uploads/${post.blogImageName}`;
            try {
                fs.unlinkSync(imgPath); // Delete image
                console.log(`Deleted image: ${imgPath}`);
            } catch (err) {
                console.error("Error deleting image:", err);
            }
        }

        // Delete the post from the database
        await Post.deleteOne({ _id: postId }).exec();
        return true;
    }
    return false;
}


// Function to update a post
async function updatePost(postId, updatedData) {
    const post = await Post.findById(postId).exec();
    if (post) {
        // Update fields conditionally
        post.postTitle = updatedData.postTitle || post.postTitle;
        post.PostContent = updatedData.PostContent || post.PostContent;
        post.Author = updatedData.Author || post.Author;

        // Save the updated post
        await post.save();
        return post;
    }
    return null; // Return null if post not found
}

app.get('/', (req, res) => {
    res.render("index.ejs");
});

app.get('/createPost', (req, res) => {
    res.render("createPost.ejs");
});

app.get('/ViewPost', async (req, res) => {
    try {
        const posts = await findAllPosts();  // Ensure posts are fetched properly
        // console.log(posts);
        res.render("ViewPost.ejs", { postData: posts });
    } catch (err) {
        console.error("Error fetching posts:", err);
        res.status(500).send("Error fetching posts from the database.");
    }
});

app.get('/post', async (req, res) => {
    const postId = req.query.id; // Using _id from the query string
    const post = await Post.findById(postId).exec(); // Find post by _id
    if (post) {
        res.render("post.ejs", { postData: post });
    } else {
        res.redirect('/error');
    }
});

app.get('/DeletePost', async (req, res) => {
    const posts = await findAllPosts();
    res.render("DeletePost.ejs", { postData: posts });
});

app.get('/delete', async (req, res) => {
    const postId = req.query.id; // Using _id from the query string
    const post = await Post.findById(postId).exec();
    if (post) {
        res.render("postPasswordDelete.ejs", { postData: post });
    } else {
        res.redirect('/error');
    }
});

app.get('/delete-post', async (req, res) => {
    const postId = req.query.id; // Using _id from the query string
    const success = await deletePost(postId);
    if (success) {
        res.send("<h1>Post successfully deleted</h1>");
    } else {
        res.send("<h1>Error in deleting post!</h1>");
    }
});

app.post('/addPost', upload.single('blogImage'), async (req, res) => {
    const data = req.body;
    console.log(data);
    if (req.file) {
        data.blogImageName = req.file.filename;
    }

    const newPost = await addPost(data);
    res.redirect("/ViewPost");
});

app.get('/updatePost', async (req, res) => {
    const posts = await findAllPosts();
    // console.log(posts);
    res.render("updatePost.ejs", { postData: posts });
});

app.get('/update', async (req, res) => {
    const postId = req.query.id; // Using _id from the query string
    const post = await Post.findById(postId).exec();
    if (post) {
        res.render("update-post-page.ejs", { postData: post });
    } else {
        res.redirect('/error');
    }
});

app.post("/postUpdated", async (req, res) => {
    const postId = req.query.id; // Extract post ID from the query string
    const { editedPostContent } = req.body;  // Extract edited content from request body

    // Ensure the post ID and edited content are available
    if (!postId || !editedPostContent) {
        return res.status(400).send("Post ID or content is missing");
    }

    try {
        // Prepare the updated data object
        const updatedData = {
            PostContent: editedPostContent  // Only updating the content here
        };

        // Call updatePost function to update the post in the database
        const updatedPost = await updatePost(postId, updatedData);

        // Check if the update was successful
        if (updatedPost) {
            res.redirect("/ViewPost");  // Redirect to view all posts after successful update
        } else {
            res.send("<script>alert('Error in updating post')</script>");
        }
    } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).send("Error updating the post");
    }
});


app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
