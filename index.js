import express from "express";
import bodyParser from "body-parser";
import fs from 'fs';
import { readFileSync } from 'fs';
import multer from 'multer';
import { dirname } from "path";
import { fileURLToPath } from "url";
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
//key to keep note of the blogPost so that we can view 
var postKeys = convertTxtToArray('./posts titles/postKeys.txt');



app.use(express.static("public"));

app.use(bodyParser.urlencoded({ extended: true }));


function deleteImageFile(file_to_delete)
{
    
    fs.unlink(file_to_delete , (err) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log('File deleted successfully');
      });
      
}



function convertTxtToArray(path) {
    const readFileLinesSync = readFileSync(path, 'UTF8').toString().split('\n');
    return readFileLinesSync.map(line => parseInt(line.trim(), 10)).filter(Number.isInteger);
}

function readJsonFile(path) {
    let blogPosts;
    try {
        const fileData = readFileSync(path, 'UTF8');
        blogPosts = fileData ? JSON.parse(fileData) : [];
    } catch (err) {
        if (err.code === 'ENOENT') {
            // File does not exist, initialize with an empty array
            blogPosts = [];
        } else {
            console.error("Error reading or parsing file:", err);
            throw err;
        }
    }
    return blogPosts;
}

function writingToJsonFile(path, data) {

    let blogPosts;

    // STEP 1: Reading JSON file
    try {
        const fileData = readFileSync(path, 'UTF8');
        blogPosts = fileData ? JSON.parse(fileData) : [];
    } catch (err) {
        if (err.code === 'ENOENT') {
            // File does not exist, initialize with an empty array
            blogPosts = [];
        } else {
            console.error("Error reading or parsing file:", err);
            throw err;
        }
    }

    // const fileData= readJsonFile(path);

    // STEP 2: Adding new data to blogPosts object 
    blogPosts.push(data);

    // STEP 3: Writing to a file 
    fs.writeFile(
        path,
        JSON.stringify(blogPosts, null, 2),
        err => {
            // Checking for errors 
            if (err) {
                console.error("Error writing file:", err);
                throw err;
            }

            // Success 
            console.log("Done writing");
        }
    );
}

function removeFromJsonFile(data,postKey,path)
{   
    delete data[postKey].key;
    delete data[postKey].postTitle;
    delete data[postKey].postPassword;
    delete data[postKey].PostContent;
    delete data[postKey].Author;
    //delete Image from directory
    var imgPath= __dirname+'/public/data/uploads/'+data[postKey].blogImageName;
    deleteImageFile(imgPath);
    delete data[postKey].blogImageName;
    
      

    fs.writeFile(
        path,
        JSON.stringify(data, null, 2),
        err => {
            // Checking for errors 
            if (err) {
                console.error("Error writing file:", err);
                throw err;
            }

            // Success 
            console.log("Done writing");
        }
    );
}


function postContent(data) {
    console.log(data);

    appendInNewLineInFile(data.postTitle, "./posts titles/postTitles.txt");//successfull

    if (postKeys.length === 0) {
        var lastPostKey = 1;
    }
    else {
        var lastPostKey = postKeys[postKeys.length - 1] + 1;
    }

    if (lastPostKey == null) {
        lastPostKey = 1;
    }
    //push in array
    postKeys.push(lastPostKey);
    //append in postKeys
    appendInNewLineInFile(lastPostKey, "./posts titles/postKeys.txt");

    //add a json file having the object data file name titled postTitle

    data.key = lastPostKey;
    console.log("data to be written in json file ", data);
    writingToJsonFile('./blogPosts/postContent.json', data);



}




//to write post titles in Posts title to find the post to view
function appendInNewLineInFile(data, path) {
    fs.open(path, 'a', 666, function (e, id) {
        fs.write(id, data + "\n", null, 'utf8', function () {
            fs.close(id, function () {
                console.log('file is updated');
            });
        });
    });
}




app.get('/', (req, res) => {

    res.render("index.ejs");
});

app.get('/createPost', (req, res) => {
    res.render("createPost.ejs");
})

app.get('/ViewPost', (req, res) => {

    let data = readJsonFile("blogPosts/postContent.json");
    res.render("ViewPost.ejs", { postData: data });
})

app.get('/post', function (req, res) {

    let data = readJsonFile("blogPosts/postContent.json");

    var postKey = req.query.key;
    console.log(postKey);
    postKey -= 1;

   

    var imgPath = "../blogPosts/data/uploads/" + data.blogImageName
    if (postKey >= 0 && postKey < data.length) {
        res.render("post.ejs", { postData: data[postKey] });
        console.log(postKey, data[postKey]);
    } else {
        // Handle invalid postKey (e.g., redirect to an error page)
        res.redirect('/error');
    }

});

app.get('/DeletePost', function (req, res) {

    let data = readJsonFile("blogPosts/postContent.json");
    res.render("DeletePost.ejs", { postData: data });

});

app.get('/delete', function (req, res) {

    let data = readJsonFile("blogPosts/postContent.json");

    console.log(req.body);
    console.log(req.query.key);
    let postKey = req.query.key;
    let objIndex;
    data.some((dataKey, dataValue) => {
        if (dataKey.key == postKey) {
            objIndex = dataValue;
            return true;
        }
    });


    res.render("postPassword.ejs", { postData: data[objIndex] });

});

app.post('/delete-post', (req, res) => {


    let data = readJsonFile("blogPosts/postContent.json");
    console.log(req.body.password);
    let key = req.query.key;
    key -= 1;
    console.log(key);
    console.log("data[key].postPassword", data[key].postPassword);
    if(req.body.password===data[key].postPassword)
        {   
            removeFromJsonFile(data,key,"blogPosts/postContent.json");
            res.send("<h1>Post successfully deleted</h1>");

        }
    else{
        res.send("<h1>Enter correct password!</h1>");
    }


});




app.post('/addPost', upload.single('blogImage'), (req, res) => {

    //for the written content
    let data = req.body;
    let fileData=req.file;
    if(fileData)
        {
            data.blogImageName = req.file.filename;
        }
    
    console.log(data);
    postContent(req.body);
    res.redirect("/ViewPost");


});

app.get('/updatePost',function(req,res){
    let data = readJsonFile("blogPosts/postContent.json");
    res.render("updatePost.ejs", { postData: data });
});

app.get('/update', function (req, res) {

    let data = readJsonFile("blogPosts/postContent.json");

    console.log(req.body);
    console.log(req.query.key);
    let postKey = req.query.key;
    let objIndex;
    data.some((dataKey, dataValue) => {
        if (dataKey.key == postKey) {
            objIndex = dataValue;
            return true;
        }
    });


    res.render("postPasswordUpdate.ejs", { postData: data[objIndex] });

});

app.post('/update-post-page', (req, res) => {


    let data = readJsonFile("blogPosts/postContent.json");
    console.log(req.body.password);
    let key = req.query.key;
    key -= 1;
    console.log(key);
    console.log("data[key].postPassword", data[key].postPassword);
    if(req.body.password===data[key].postPassword)
        {   
            res.render("update-post-page.ejs",{postData:data[key]});

        }
    else{
        res.send("<h1>Enter correct password!</h1>");
    }


});

app.post("/postUpdated",(req,res)=>{

    let postKey = req.query.key;
    let data = readJsonFile("blogPosts/postContent.json");
    let objIndex;
    data.some((dataKey, dataValue) => {
        if (dataKey.key == postKey) {
            objIndex = dataValue;
            return true;
        }
    });
    console.log(postKey);
    console.log(objIndex);
    console.log(req.body.editedPostContent);
    data[objIndex].PostContent=req.body.editedPostContent;
    let jsonFilePath ='./blogPosts/postContent.json';
    fs.writeFile(
        jsonFilePath,
        JSON.stringify(data, null, 2),
        err => {
            // Checking for errors 
            if (err) {
                console.error("Error writing file:", err);
                throw err;
            }

            // Success 
            console.log("Done writing");
        res.redirect("/ViewPost");
        }
        
    );


});

app.listen(port, () => {
    console.log(`Server is running at ${port}`);
});