const usersCollection = require('../db').db().collection("users");
const followsCollection = require('../db').db().collection("follows");
const ObjectID = require('mongodb').ObjectID;
const User = require('./User');

class Follow {
    constructor(followedUsername, authorId) {
        this.followedUsername = followedUsername;
        this.authorId = authorId;
        this.errors = [];
    }

    cleanUp() {
        if(typeof(this.followedUsername) !== 'string') {
            this.followedUsername = '';
        }
    }

    async validate(action) {
        const followedAccount = await usersCollection.findOne({
            username: this.followedUsername
        });

        if(followedAccount) {
            this.followedId = followedAccount._id;
        }
        else {
            this.errors.push("You cannot follow a user that does not exist.");
        }

        let doesFollowAlreadyExist = await followsCollection.findOne({
            followedId: this.followedId,
            authorId: new ObjectID(this.authorId)
        });

        // Check if this validation is called during create or delete
        if(action === "create") {
            if(doesFollowAlreadyExist) {
                this.errors.push("You are already following this user.");
            }
        }

        if(action === "delete") {
            if(!doesFollowAlreadyExist) {
                this.errors.push("You cannot stop following user you are not following.");
            }
        }

        // Should not be able to follow yourself
        if(this.followedId.equals(this.authorId)) {
            this.errors.push("You cannot follow yourself.");
        }
    }

    create() {
        return new Promise(async (resolve, reject) => {
            this.cleanUp();
            await this.validate("create");

            if(this.errors.length === 0) {
                await followsCollection.insertOne({
                    followedId: this.followedId,
                    authorId: new ObjectID(this.authorId)
                });
                resolve();
            }
            else {
                reject(this.errors);
            }
        });
    }

    delete() {
        return new Promise(async (resolve, reject) => {
            this.cleanUp();
            await this.validate("delete");

            if(this.errors.length === 0) {
                await followsCollection.deleteOne({
                    followedId: this.followedId,
                    authorId: new ObjectID(this.authorId)
                });
                resolve();
            }
            else {
                reject(this.errors);
            }
        });
    }
}

Follow.isVisitorFollowing = async (followedId, visitorId) => {
    let followDoc = await followsCollection.findOne({
        followedId,
        authorId: new ObjectID(visitorId) 
    });

    return followDoc ? true : false;
}

Follow.getFollowersById = (id) => {
    return new Promise(async (resolve, reject) => {
        try {
            let followers = await followsCollection.aggregate([
                {
                    $match: {
                        followedId: id  // In follow collection, find followedId matches userProfile id
                    }
                },
                {
                    $lookup: {
                        from: "users",  // To join the users collection
                        localField: "authorId", // From the authorId in follow collection
                        foreignField: "_id",    // To match _id field
                        as: "userDoc"   // Output userDoc array field contains items from the 'from' collection, and insert to results from previous match
                    } 
                },
                {
                    $project: {     // Pass the document with specific fields
                        username: {
                            $arrayElemAt: ["$userDoc.username", 0]   // Get username from the 1st at userDoc.username
                        },
                        email: {
                            $arrayElemAt: ["$userDoc.email", 0]      // Get email from the 1st at userDoc.email
                        }
                    }
                }
            ]).toArray();
            
            // Got username and email from above, but we need username and avatar, so make use of User.
            followers = followers.map((follower) => {
                let user = new User(follower, true);
                return {
                    username: follower.username,
                    avatar: user.avatar
                };
            });
            
            resolve(followers);
        }
        catch {
            reject();
        }
    });
}

Follow.getFollowingById = (id) => {
    return new Promise(async (resolve, reject) => {
        try {
            let followers = await followsCollection.aggregate([
                {
                    $match: {
                        authorId: id  // In follow collection, find followedId matches userProfile id
                    }
                },
                {
                    $lookup: {
                        from: "users",  // To join the users collection
                        localField: "followedId", // From the authorId in follow collection
                        foreignField: "_id",    // To match _id field
                        as: "userDoc"   // Output userDoc array field contains items from the 'from' collection, and insert to results from previous match
                    } 
                },
                {
                    $project: {     // Pass the document with specific fields
                        username: {
                            $arrayElemAt: ["$userDoc.username", 0]   // Get username from the 1st at userDoc.username
                        },
                        email: {
                            $arrayElemAt: ["$userDoc.email", 0]      // Get email from the 1st at userDoc.email
                        }
                    }
                }
            ]).toArray();
            
            // Got username and email from above, but we need username and avatar, so make use of User.
            followers = followers.map((follower) => {
                let user = new User(follower, true);
                return {
                    username: follower.username,
                    avatar: user.avatar
                };
            });
            
            resolve(followers);
        }
        catch {
            reject();
        }
    });
}

Follow.countFollowersById = function(id) {
    return new Promise(async (resolve, reject) => {
        // Use countDocuments() to count numbers of a match
        let followerCount = await followsCollection.countDocuments({ followedId: id });
        resolve(followerCount);
    });
}

Follow.countFollowingById = function(id) {
    return new Promise(async (resolve, reject) => {
        // Use countDocuments() to count numbers of a match
        let followingCount = await followsCollection.countDocuments({ authorId: id });
        resolve(followingCount);
    });
}

module.exports = Follow;