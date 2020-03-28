const Post = require('../models/Post');

exports.viewCreateScreen = (req, res) => {
    res.render('create-post');
}

exports.create = (req, res) => {
    let post = new Post(req.body, req.session.user._id);
    post.create()
        .then((newId) => {
            req.flash("success", "New post successfully created.");
            req.session.save(() => res.redirect(`/post/${newId}`));
        })
        .catch((errors) => {
            errors.forEach(error => req.flash("errors", error));
            req.session.save(() => res.redirect('/create-post'));
        });
}

exports.viewSingle = async (req, res) => {
    try {
        const post = await Post.findSingleById(req.params.id, req.visitorId);
        res.render('single-post-screen', { post });
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