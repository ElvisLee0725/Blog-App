const User = require('../models/User');
const Post = require('../models/Post');
const Follow = require('../models/Follow');
const jwt = require('jsonwebtoken');

exports.apiGetPostsByUsername = async (req, res) => {
    try {
        let authorDoc = await User.findByUsername(req.params.username);
        let posts = await Post.findByAuthorId(authorDoc._id);
        res.json(posts);
    }
    catch {
        res.json("Sorry, invalid user requested.");
    }
}

exports.sharedProfileData = async (req, res, next) => {
    let isVisitorsProfile = false;
    let isFollowing = false;
    // Only check when visitor is loggin in
    if(req.session.user) {
        isVisitorsProfile = req.profileUser._id.equals(req.session.user._id);   // Check if current profile is the same as logged in user
        isFollowing = await Follow.isVisitorFollowing(req.profileUser._id, req.visitorId);
    }
    
    req.isVisitorsProfile = isVisitorsProfile;
    req.isFollowing = isFollowing;

    // Retrieve posts, followers and following counts with Promises. Use Promise.all() since none of them depend on each other
    const postCountPromise = Post.countPostsByAuthor(req.profileUser._id);
    const followerCountPromise = Follow.countFollowersById(req.profileUser._id);
    const followingCountPromise = Follow.countFollowingById(req.profileUser._id);

    // Array destructure to get results from a returning array:
    const [postCount, followerCount, followingCount] = await Promise.all([postCountPromise, followerCountPromise, followingCountPromise]);
    
    req.postCount = postCount;
    req.followerCount = followerCount;
    req.followingCount = followingCount;

    next();
}

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

exports.apiLogin = (req, res) => {
    let user = new User(req.body);
    user.login()
        .then((response) => {
            // Use .sign(<payload>, <private key>, <expiration time>) to create a json web token 
            res.json(jwt.sign({ _id: user.data._id}, process.env.JWTSECRET, { expiresIn: '7d'}));
        })
        .catch((err) => {
            res.json("Your username or password is wrong.");
        });
}

exports.apiMustBeLoggedIn = (req, res, next) => {
    // jwt.verify(req.body, private key)
    try {
        // .verify() will decode the token and return the payload, which is { _id: user.data._id }
        req.apiUser = jwt.verify(req.body.token, process.env.JWTSECRET);
        next();
    }
    catch {
        res.json("Sorry, you must provide a valid token.");
    }
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

exports.home = async (req, res) => {
    if(req.session.user) {
        // Fetch feed of posts for current user
        const posts = await Post.getFeed(req.session.user._id);
        res.render('home-dashboard', {
            posts
        });
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
                title: `Profile - ${req.profileUser.username}`,
                currentPage: 'posts',
                profileUsername: req.profileUser.username,
                profileAvatar: req.profileUser.avatar,
                isFollowing: req.isFollowing,
                isVisitorsProfile: req.isVisitorsProfile,
                counts: {
                    postCount: req.postCount,
                    followerCount: req.followerCount,
                    followingCount: req.followingCount
                }
            });
        })
        .catch(() => {
            res.render('404');
        });
}

exports.profileFollowersScreen = async (req, res) => {
    try {
        const followers = await Follow.getFollowersById(req.profileUser._id);
        res.render('profile-followers', {
            followers, 
            currentPage: 'followers',
            profileUsername: req.profileUser.username,
            profileAvatar: req.profileUser.avatar,
            isFollowing: req.isFollowing,
            isVisitorsProfile: req.isVisitorsProfile,
            counts: {
                postCount: req.postCount,
                followerCount: req.followerCount,
                followingCount: req.followingCount
            }
        });
    }
    catch {
        res.render('404');
    }
}

exports.profileFollowingScreen = async (req, res) => {
    try {
        const following = await Follow.getFollowingById(req.profileUser._id);
        res.render('profile-following', {
            following, 
            currentPage: 'following',
            profileUsername: req.profileUser.username,
            profileAvatar: req.profileUser.avatar,
            isFollowing: req.isFollowing,
            isVisitorsProfile: req.isVisitorsProfile,
            counts: {
                postCount: req.postCount,
                followerCount: req.followerCount,
                followingCount: req.followingCount
            }
        });
    }
    catch {
        res.render('404');
    }
}

exports.doesUsernameExist = (req, res) => {
    User.findByUsername(req.body.username)
        .then(() => {
            res.json(true);
        })
        .catch(() => {
            res.json(false);
        })
}

exports.doesEmailExist = async (req, res) => {
    const emailExist = await User.doesEmailExist(req.body.email);
    // return true or false
    res.json(emailExist);
}