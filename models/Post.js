const postsCollection = require('../db').db().collection("posts");
const ObjectID = require('mongodb').ObjectID;
const User = require('./User');
const sanitizeHTML = require('sanitize-html');

class Post {
    constructor(data, userId, requestedPostId) {
        this.data = data;
        this.errors = [];
        this.userId = userId;
        this.requestedPostId = requestedPostId;
    }

    cleanUp() {
        const { title, body } = this.data;
        if(typeof(title) !== "string") {
            title = "";
        }
        if(typeof(body) !== "string") {
            body = "";
        }

        this.data = {
            title: sanitizeHTML(title.trim(), { allowedTags: [], allowedAttributes: {} }),
            body: sanitizeHTML(body.trim(), { allowedTags: [], allowedAttributes: {} }),
            createdDate: new Date(),
            author: ObjectID(this.userId)   // MongoDB requires using objectID to prcess id first. 
        };
    }

    validate() {
        if(this.data.title === "") {
            this.errors.push("You must provide a title.");
        }
        if(this.data.body === "") {
            this.errors.push("You must provide a post content.");
        }
    }

    create() {
        return new Promise((resolve, reject) => {
            this.cleanUp();
            this.validate();
            if(this.errors.length === 0) {
                postsCollection.insertOne(this.data)
                    .then((info) => {
                        resolve(info.ops[0]._id);   // After MongoDB creates the post, it returns info, the 1st item contains the id
                    })
                    .catch(() => {
                        this.errors.push("Please try again later.");
                        reject(this.errors);
                    });
            }
            else {
                reject(this.errors);
            }
        });
    }

    update() {
        return new Promise(async (resolve, reject) => {
            try {
                let post = await Post.findSingleById(this.requestedPostId, this.userId);
                if(post.isVisitorOwner) {
                    // Save updated post to MongoDB
                    let status = await this.actuallyUpdate();
                    resolve(status);
                }
                else {
                    reject();
                }
            }
            catch {
                reject();
            }
        });
    }

    actuallyUpdate() {
        return new Promise(async (resolve, reject) => {
            this.cleanUp();
            this.validate();
            if(this.errors.length === 0) {
                await postsCollection.findOneAndUpdate({ _id: new ObjectID(this.requestedPostId) }, {
                    $set: {
                        title: this.data.title,
                        body: this.data.body
                    }
                });
                resolve("success");
            }
            else {
                resolve("failure");
            }
        });
    }
}

Post.reusablePostQuery = function(uniqueOperations, visitorId) {
    return new Promise(async (resolve, reject) => {
        let aggOperations = uniqueOperations.concat([
            {
                $lookup: {
                    from: "users",          // From the users collections
                    localField: "author",   // Use localField author in post collection 
                    foreignField: "_id",    // Use foreignField _id in users collection
                    as: "authorDocument"    // Create a new property for the lookup result
                }
            },
            {
                $project: {     // Project the result to this object format
                    title: 1,
                    body: 1,
                    createdDate: 1,
                    authorId: "$author",
                    author: {   // Modify the author property
                        $arrayElemAt: ["$authorDocument", 0]
                    }
                }
            }
        ]);

        let posts = await postsCollection.aggregate(aggOperations).toArray();

        // Clean up author property in each post object
        posts = posts.map((post) => {
            post.isVisitorOwner = post.authorId.equals(visitorId);  // .equals is MongoDB method to compare ObjectId
            post.authorId = undefined;

            post.author = {
                username: post.author.username,
                avatar: new User(post.author, true).avatar
            }
            return post;
        });

        resolve(posts);
    });
}

// We don't need to instantiate a new object to call this function:
Post.findSingleById = function(id, visitorId) {
    return new Promise(async (resolve, reject) => {
        if(typeof(id) !== "string" || !ObjectID.isValid(id)) {
            reject();
            return ;
        }
        
        let posts = await Post.reusablePostQuery([{
            $match: {
                _id: new ObjectID(id)
            }
        }], visitorId);

        if(posts.length > 0) {
            // Just need the 1st post from the search
            resolve(posts[0]);
        }
        else {
            reject();
        }
    });
}

Post.findByAuthorId = function(authorId) {
    return Post.reusablePostQuery([
        {
            $match: {
                author: authorId
            }
        },
        {
            $sort: {
                createdDate: -1
            }
        }
    ]);
}

Post.delete = function(postIdToDelete, curUserId) {
    return new Promise(async (resolve, reject) => {
        try {
           const post = await Post.findSingleById(postIdToDelete, curUserId);
            if(post.isVisitorOwner) {
                await postsCollection.deleteOne({ _id: new ObjectID(postIdToDelete)});
                resolve();
            }
            else {
                reject();
            } 
        }
        catch {
            reject();
        } 
    });    
}

Post.search = function(searchTerm) {
    return new Promise(async (resolve, reject) => {
        if(typeof(searchTerm) === "string") {
            const posts = await Post.reusablePostQuery([
                {$match: {
                    $text: {
                        $search: searchTerm
                    }
                }},
                {$sort: {
                    $score: {
                        $meta: 'textScore'
                    }
                }}
            ]);
            resolve(posts);
        }
        else {
            reject();
        }
    });
}

module.exports = Post;