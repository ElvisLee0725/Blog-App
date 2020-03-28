const User = require('../models/User');
const Post = require('../models/Post');

exports.mustBeLoggedIn = (req, res, next) => {
    if(req.session.user) {
        next();
    }
    else {
        req.flash("errors", "You must be logged in to perform that action");
        req.session.save(() => {
            res.redirect('/');
        });
    }
}

exports.login = (req, res) => {
    let user = new User(req.body);
    user.login()
        .then((response) => {
            req.session.user = { 
                avatar: user.avatar, 
                username: user.data.username,
                _id: user.data._id 
            };
            // The new session object is async, so use .save(callback to redirect)
            req.session.save(() => {
                res.redirect('/');
            });
        })
        .catch((err) => {
            // .flash() will add a flash object with errors:[] in the session
            req.flash('errors', err);
            req.session.save(() => {
                res.redirect('/');
            });
        });
}

exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });   // Find that matching session id in MongoDb and destroy it. After that, redirect to homepage.
}

exports.register = (req, res) => {
    let user = new User(req.body);
    user.register()
        .then(() => {
            req.session.user = { 
                avatar: user.avatar,   
                username: user.data.username,
                _id: user.data._id
            };
           req.session.save(() => {
               res.redirect('/');
           });
        })
        .catch((registerErrors) => {
            registerErrors.forEach((error) => {
                req.flash('registerErrors', error);
            });
            req.session.save(() => {
                res.redirect('/');
            });
        });
}

exports.home = (req, res) => {
    if(req.session.user) {
        res.render('home-dashboard');
    }
    else {
        res.render('home-guest', { 
            registerErrors: req.flash('registerErrors') 
        });  // flash property in session will be accessed and deleted
    }
}

exports.ifUserExists = (req, res, next) => {
    User.findByUsername(req.params.username)
        .then((userDocument) => {
            req.profileUser = userDocument;     // Create a property profileUser and assgin value
            next();
        })
        .catch(() => {
            res.render('404');
        });
}

exports.profilePostsScreen = (req, res) => {
    Post.findByAuthorId(req.profileUser._id)
        .then((posts) => {
            res.render('profile', {
                posts,
                profileUsername: req.profileUser.username,
                profileAvatar: req.profileUser.avatar
            });
        })
        .catch(() => {
            res.render('404');
        });
}