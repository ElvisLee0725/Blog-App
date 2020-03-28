const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);   // It will store the session to MongoDB session collection
const flash = require('connect-flash');
const markdown = require('marked');
const app = express();

// Configuration of a session
let sessionOptions = session({
    secret: "JavaScript is sooo coool", // Just something unique
    store: new MongoStore({client: require('./db')}),   // The db.js exports a client
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 1000 * 60 * 60 * 24,   // 1 day
        httpOnly: true 
    }
});

app.use(sessionOptions);    // Use the session defined above
app.use(flash());

app.use((req, res, next) => {
    // Make markdown function available in all ejs templates
    res.locals.filterUserHTML = function(content) {
        return markdown(content);
    }

    // Make all success and error flash message available from all ejs templates
    res.locals.success = req.flash("success");
    res.locals.errors = req.flash("errors");

    // Make current user id available on the req object
    if(req.session.user) {
        req.visitorId = req.session.user._id;
    }
    else {
        req.visitorId = 0;
    }

    // res.locals is an object accessible from .ejs templates. Make user session data available in view template
    res.locals.user = req.session.user;
    next();
});

const router = require('./router');

app.use(express.urlencoded({extended: false})); // Tell Express to add user input data to req.body so we can use
app.use(express.json());    // Send over json

app.use(express.static('public'));  // Use public folder for styles
app.set('views', 'views');  // 2nd argument is the folder to store views
app.set('view engine', 'ejs');

app.use('/', router);

module.exports = app;