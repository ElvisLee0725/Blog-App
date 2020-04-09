const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);   // It will store the session to MongoDB session collection
const flash = require('connect-flash');
const markdown = require('marked');
const sanitizeHTML = require('sanitize-html');
const csrf = require('csurf');
const app = express();

app.use(express.urlencoded({extended: false})); // Parsing urlencoded data sent from clients Ex. From forms
app.use(express.json());    //  Parsing JSON sent from client
// This is just for /api route, all things below this won't apply to create a light-weight api.
app.use('/api', require('./router-api'));

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

    // res.locals is an object accessible from .ejs templates. 
    // To access, just use 'success', 'errors', and 'user'
    res.locals.success = req.flash("success");
    res.locals.errors = req.flash("errors");
    res.locals.user = req.session.user; // Make user session data available in view template
    
    // Make current user id available on the req object
    if(req.session.user) {
        req.visitorId = req.session.user._id;
    }
    else {
        req.visitorId = 0;
    }

    next();
});

const router = require('./router');

app.use(express.static('public'));  // Use public folder for styles
app.set('views', 'views');  // 2nd argument is the folder to store views
app.set('view engine', 'ejs');

app.use(csrf());
app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken(); // Generate csrf token for html templates to use
    next();
});

app.use('/', router);

// Handle CSRF and other errors
app.use((err, req, res, next) =>{
    if(err) {
        if(err.code === "EBADCSRFTOKEN") {
            req.flash("errors", "Cross site request forgery detected.");
            req.session.save(() => res.redirect('/'));
        }
        else {
            res.render("404");
        }
    }
});

// Power both the express app and socket connection
const server = require('http').createServer(app);
const io = require('socket.io')(server);

io.use((socket, next) => {
    sessionOptions(socket.request, socket.request.res, next);
});

io.on('connection', (socket) => {
   if(socket.request.session.user) {
        const user = socket.request.session.user;
        socket.emit('welcome', {
            username: user.username,
            avatar: user.avatar
        });
        // Listening to a message from browser
        socket.on('chatMessageFromBrowser', (data) => {
            // Socket sends message to all connected browsers except sender itself
            socket.broadcast.emit('chatMessageFromServer', {
                // Prevent user from sending malicious html, js tags
                message: sanitizeHTML(data.message, {
                    allowedTags: [],
                    allowedAttributes: {}
                }),
                username: user.username,
                avatar: user.avatar
            });
        });
   } 
});

module.exports = server;