//jshint esversion:6 //this is to tell jshint to use ES6 syntax
const dotenv = require("dotenv")
dotenv.config(); //for use of .env to keep variables secret and safe
const express = require("express"); // Express web server framework
const https = require("https"); // HTTPS module
const app = express(); // Create a new Express application

  
app.set("view engine", "ejs"); //this is the view engine
app.use(express.urlencoded({ extended: true })); //this is the body parser
app.use(express.json()); //this is the body parser

const mongoose = require("mongoose"); //for use of mongoose to connect to mongodb
const encrypt = require("mongoose-encryption"); //for use of mongoose-encryption to encrypt the password
const { rmSync } = require("fs");
const apikey= process.env.REACT_APP_PW2; //this is the api key for the Mongo api

mongoose.connect(
    'mongodb+srv://Tullydev:'+ apikey + 
    '@atlascluster.kqejwjk.mongodb.net/SecretsUserDB?retryWrites=true&w=majority',
     {useNewUrlParser: true, useUnifiedTopology: true}
     ); //connect to mongodb

//need a schema for the user but with mongoose we needed to use a plugin to encrypt the password so we need to use the mongoose-encryption plugin
const userSchema = new mongoose.Schema({
    email: String,
    password: String
});
//we need to use the mongoose-encryption plugin to encrypt the password so we need a secret key for the encryption
const secret = process.env.REACT_APP_ENCRRIPTIONKEY; //this is the secret key for the encryption
//we need to use the mongoose-encryption plugin to encrypt the password so we need to use the plugin
userSchema.plugin(encrypt, { secret: secret, encryptedFields: ["password"] });


//we than need to create a model for the user
const User = new mongoose.model("User", userSchema);

//render the home page
app.get("/", function (req, res) {
    res.render("home");
});

//render the about page 
app.get("/login", function (req, res) {
    res.render("login");
});

//render the register page
app.get("/register", function (req, res) {
    res.render("register");
});

app.get("/logout", function (req, res) {
    res.render("home");
});

//now we need to catch the post request from the register page
app.post("/register", function (req, res) {
    //we need to create a new user
    const newUser = new User({
        email: req.body.username,
        password: req.body.password
    });
    //we need to save the new user to the database
    // and if the user is saved we need to render the secrets page
    // THIS IS WHERE WE NEED TO SET THE SECRETS PAGE TO BEING SEEN BY ONLY THE USER.
    newUser.save(function (err) {
        if (err) {
            console.log(err);
          
        } else {
            res.render("secrets");
        }
    });
});
//now we need to catch the post request from the login page
app.post("/login", function (req, res) {
    //we need to find the user in the database
    const username = req.body.username;
    const password = req.body.password;
    //we need to find the user in the database
    User.findOne({email: username}, function (err, foundUser) {
        if (err) {
            console.log(err);
            
        } else {
            if (foundUser) {
                if (foundUser.password === password) {
                    res.render("secrets");
                }
            }
        }
    });
});


app.listen(process.env.PORT || 3000, function () {
    console.log("Server started on port 3000");
    }
);