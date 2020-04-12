const Post = require('../models/Post');
const User = require('../models/User');
const sendgrid = require('@sendgrid/mail');
sendgrid.setApiKey(process.env.SENDGRIDAPIKEY);

exports.viewCreateScreen = (req, res) => {
    res.render('create-post');
}

exports.create = (req, res) => {
    let post = new Post(req.body, req.session.user._id);
    post.create()
        .then(async (newId) => {
            // Get the username of the new post, then send email to website owner to notify a new post using SendGrid:
            try {
                const username = await User.findUsernameById(post.data.author);
                await sendgrid.send({
                    to: 'elvislee0725@gmail.com',
                    from: 'elvis0725@hotmail.com',
                    subject: 'You have a new post on Blog App',
                    text: `Check out this new post ${post.data.title} by ${username}.`,
                    html: `Check out this new post <em><a href="https://${req.hostname}/post/${newId}" class="text-decoration-none">${post.data.title}</a></em> by <strong>${username}</strong>.`
                });
            }
            catch(err){
                console.error(err.toString());
            }
            
            req.flash("success", "New post successfully created.");
            req.session.save(() => res.redirect(`/post/${newId}`));
        })
        .catch((errors) => {
            errors.forEach(error => req.flash("errors", error));
            req.session.save(() => res.redirect('/create-post'));
        });
}

exports.apiCreate = (req, res) => {
    let post = new Post(req.body, req.apiUser._id);
    post.create()
        .then((newId) => {
            res.json("Congrats, the post is successful.")
        })
        .catch((errors) => {
            res.json(errors);
        });
}

exports.viewSingle = async (req, res) => {
    try {
        const post = await Post.findSingleById(req.params.id, req.visitorId);
        res.render('single-post-screen', { post , title: post.title });
    }
    catch {
        res.render('404');
    }
}

exports.viewEditScreen = async(req, res) => {
    try {
        const post = await Post.findSingleById(req.params.id, req.visitorId);
        // Here it must use == to compare post.authorId and req.visitorId, what a witchcraft!
        if(post.isVisitorOwner) {
            res.render('edit-post', { post });
        }
        else {
            req.flash("errors", "You do not have permission to edit this post");
            req.session.save(() => res.redirect('/'));
        }
    }
    catch {
        res.render('404');
    }
}

exports.edit = (req, res) => {
    let post = new Post(req.body, req.visitorId, req.params.id);
    post.update()
        .then((status) => {
            if(status === "success") {
                req.flash("success", "Post successfully updated.");
                req.session.save(() => {
                    res.redirect(`/post/${req.params.id}/edit`);
                });
            } 
            else {
                // If there is error Ex. Title or Body is left blank, redirect user back to this edit page
                post.errors.forEach((error) => {
                    req.flash("errors", error);
                });
                req.session.save(() => {
                    res.redirect(`/post/${req.params.id}/edit`);
                });
            }
        })
        .catch(() => {
            req.flash("errors", "You do not have permission to perform this action.");
            req.session.save(() => {
                res.redirect('/');
            });
        })
}

exports.delete = (req, res) => {
    Post.delete(req.params.id, req.visitorId)
        .then(() => {
            req.flash("success", "Post successfully deleted.");
            req.session.save(() => {
                res.redirect(`/profile/${req.session.user.username}`)
            });
        })
        .catch(() => {
            req.flash("errors", "You do not have the permission to perform that action.");
            req.session.save(() => {
                res.redirect('/');
            });
        });
}

exports.apiDelete = (req, res) => {
    Post.delete(req.params.id, req.apiUser._id)
        .then(() => {
            res.json("The post is deleted successfully.");
        })
        .catch(() => {
            res.json("You do not have the permission to delete this post.");
        });
}

exports.search = (req, res) => {
    Post.search(req.body.searchTerm)
        .then((posts) => {
            res.json(posts);
        })
        .catch(() => {
            res.json([]);
        });
}