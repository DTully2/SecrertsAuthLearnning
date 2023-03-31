//jshint esversion:6 //this is to tell jshint to use ES6 syntax
const dotenv = require("dotenv");
dotenv.config(); //for use of .env to keep variables secret and safe
const express = require("express"); // Express web server framework
const https = require("https"); // HTTPS module
const app = express(); // Create a new Express application
// const md5 = require("md5"); //for use of md5 hashing
// const bcrypt = require("bcrypt"); //for use of bcrypt hashing
// const saltRounds = 10; //for use of bcrypt hashing
app.set("view engine", "ejs"); //this is the view engine
app.use(express.urlencoded({ extended: true })); //this is the body parser
app.use(express.json()); //this is the body parser
app.use(express.static("public")); //this is the public folder (static files)
const mongoose = require("mongoose"); //for use of mongoose to connect to mongodb'
const session = require("express-session"); //for use of express-session
const passport = require("passport"); //for use of passport
const passportLocalMongoose = require("passport-local-mongoose"); //for use of passport-local-mongoose
var GoogleStrategy = require("passport-google-oauth2").Strategy; //for use of passport-google-oauth2
const findOrCreate = require("mongoose-findorcreate"); //for use of mongoose-findorcreate
const FacebookStrategy = require('passport-facebook').Strategy; //for use of passport-facebook


// taking out mongoose-encryption for MD5 hashing
// const encrypt = require("mongoose-encryption"); //for use of mongoose-encryption to encrypt the password
const { rmSync } = require("fs"); //for use of fs to remove files
const apikey = process.env.REACT_APP_PW2; //this is the api key for the Mongo api
const secret = process.env.REACT_APP_ENCRRIPTIONKEY;
//we need to use the express-session plugin to use sessions
app.use(
  session({
    secret: secret,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize()); //for use of passport
app.use(passport.session()); // for use of passport

mongoose.connect(
  "mongodb+srv://Tullydev:" +
    apikey +
    "@atlascluster.kqejwjk.mongodb.net/SecretsUserDB?retryWrites=true&w=majority",
  { useNewUrlParser: true, useUnifiedTopology: true }
); //connect to mongodb

//need a schema for the user but with mongoose we needed to use a plugin to encrypt the password so we need to use the mongoose-encryption plugin
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String,
});
//we need to use the mongoose-encryption plugin to encrypt the password so we need a secret key for the encryption
//this is the secret key for the encryption
//removed the mongoose-encryption plugin for MD5 hashing
//we need to use the mongoose-encryption plugin to encrypt the password so we need to use the plugin
// userSchema.plugin(encrypt, { secret: secret, encryptedFields: ["password"] });
userSchema.plugin(passportLocalMongoose); //for use of passport-local-mongoose to hash and salt the password
userSchema.plugin(findOrCreate); //for use of mongoose-findorcreate
//we than need to create a model for the user
const User = new mongoose.model("User", userSchema); // this is the model for the user

passport.use(User.createStrategy()); // for use of passport
passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CLIENT_CALLBACK,
      passReqToCallback: true,
    },
    function (request, accessToken, refreshToken, profile, done) {
        // console.log(profile)
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return done(err, user);
      });
    }
  )
);
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: process.env.FACEBOOK_CALLBACK
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

//render the home page
app.get("/", function (req, res) {
  res.render("home");
});
//used to link to the href on the button on the login and register page
//this is the google auth route NO CALLBACK NEEDED
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["email", "profile"] })
);
app.get(
  "/auth/google/secrets",
  passport.authenticate("google", {//this is where we authenticate the user localy 
    // successRedirect: "/auth/google/success",
    failureRedirect: "/login",//so that if it fails it will go to the login page
  }),function(req,res){
    res.redirect("/secrets");
  }
);
//facebook auth route
app.get('/auth/facebook',
    passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
    passport.authenticate('facebook', { failureRedirect: '/login' }),
    function(req, res) {
        // Successful authentication, redirect home.
        res.redirect('/secrets');
    });


//render the about page
app.get("/login", function (req, res) {
  res.render("login");
});

//render the sumbit page
app.get("/submit", function (req, res) {
    if (req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});
//set up the post request for the submit page
app.post("/submit", function (req, res) {
    const submittedSecret = req.body.secret;
   
    //once the user submits the secret we need to save it to the database
    //we need to find the user in the database
    User.findById(req.user.id, function (err, foundUser) {       
        if (err) {
            console.log(err);
        } else {
            if (foundUser) {
                foundUser.secret = submittedSecret;
               
                foundUser.save(function () {
                    res.redirect("/secrets");
                });
                console.log(foundUser);
            }
        }
    });
});
//render the register page
app.get("/register", function (req, res) {
  res.render("register");
});
//check to see if the useers is authenticated and if it is render the secrets page
//so they can if they are alrerady log in just go to the page and not have to log in again
app.get("/secrets", function (req, res) {
//   if (req.isAuthenticated()) {
//     res.render("secrets");
//   } else {
//     res.redirect("/login");
//   }
    //we want to be able to see all posts if the user is authenticated or not
    //look through the secret feild and pick out the ones that are not null
    User.find({"secret":{$ne:null}},function(err,foundUsers){
        if(err){
            console.log(err);
        }else{
            if(foundUsers){
                res.render("secrets",{usersWithSecrets:foundUsers});
            }
        }
    });
});
//need to log the user out
app.get("/logout", function (req, res) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

//now we need to catch the post request from the register page
app.post("/register", function (req, res) {
  //passport package being useed here
  User.register(
    { username: req.body.username },
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/secrets");
        });
      }
    }
  );
  //we need to create a new user
  //   bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
  //     const newUser = new User({
  //       email: req.body.username,
  //       //we need to hash the password useing md5
  //       password: hash,
  //     });
  //     //we need to save the new user to the database
  //     // and if the user is saved we need to render the secrets page
  //     // THIS IS WHERE WE NEED TO SET THE SECRETS PAGE TO BEING SEEN BY ONLY THE USER.
  //     newUser.save(function (err) {
  //       if (err) {
  //         console.log(err);
  //       } else {
  //         res.render("secrets");
  //       }
  //     });
  //   });
});
//now we need to catch the post request from the login page
app.post("/login", function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });
  //passport login function
  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets");
      });
    }
  });
  //   //we need to find the user in the database
  //   const username = req.body.username;
  //   const password = req.body.password;
  //   //we need to find the user in the database
  //   User.findOne({ email: username }, function (err, foundUser) {
  //     if (err) {
  //       console.log(err);
  //     } else {
  //       if (foundUser) {
  //         bcrypt.compare(password, foundUser.password, function(err, result) {
  //          if(result ===true )
  //             {
  //             res.render("secrets");
  //             }
  //         });
  //         }
  //     }
  //     });
});




app.listen(process.env.PORT || 3000, function () {
  console.log("Server started on port 3000");
});
