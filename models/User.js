const bcrypt = require('bcryptjs');
const usersCollection = require('../db').db().collection('users');
const validator = require('validator');
const md5 = require('md5');

class User {
    // If getAvatar is true, it will automatically get avatar
    constructor(data, getAvatar) {
        this.data = data;
        this.errors = [];
        if(getAvatar === undefined) {
            getAvatar = false;
        }
        if(getAvatar) {
            this.getAvatar();
        }
    }

    login() {
        return new Promise((resolve, reject) => {
            this.clearUp();
            const { username, password } = this.data;
            // .findOne() also returns a Promise
            usersCollection.findOne({ username })
                .then((attemptUser) => {
                    if(attemptUser && bcrypt.compareSync(password, attemptUser.password)) {
                        // Since login only enters username and password without email, we need to assign it back to this.data
                        this.data = attemptUser;
                        this.getAvatar();
                        resolve("Congrat!");
                    }
                    else {
                        reject("Invalid username / password");
                    }
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    clearUp() {
        let { username, email, password } = this.data;
    
        if(typeof(username) !== 'string') {
            username = '';
        }
        if(typeof(email) !== 'string') {
            email = '';
        }
        if(typeof(password) !== 'string') {
            password = '';
        }

        // Get rid of extra properties entered by user, only keep username, email and password
        this.data = {
            username: username.trim().toLowerCase(),
            email: email.trim().toLowerCase(),
            password
        };
    }

    validate() {
        return new Promise(async (resolve, reject) => {
            const { username, email, password } = this.data;

            if(username === "") {
                this.errors.push("You must provide a username.");
            }

            if(username !== "" && !validator.isAlphanumeric(username)) {
                this.errors.push("Username can only contain letters and numbers");
            }

            if(!validator.isEmail(email)) {
                this.errors.push("You must provide an valid email.");
            }

            if(password === "") {
                this.errors.push("You must provide a password.");
            }

            if(password.length > 0 && password.length < 12) {
                this.errors.push("Password must be at least 12 characters");
            }

            if(password.length > 30) {
                this.errors.push("Password cannot be over 30 characters");
            }

            if(username.length > 0 && username.length < 3) {
                this.errors.push("Username must be at least 3 characters");
            }

            if(username.length > 30) {
                this.errors.push("Username cannot be over 30 characters");
            }

            // Only check a valid username if it's already taken
            if(username.length > 2 && username.length < 31 && validator.isAlphanumeric(username)) {
                const usernameExist = await usersCollection.findOne({ username });
                if(usernameExist) {
                    this.errors.push("This username is taken!");
                }
            }

            // Only check a valid email if it's already taken
            if(validator.isEmail(email)) {
                const emailExist = await usersCollection.findOne({ email });
                if(emailExist) {
                    this.errors.push("This email is used!");
                }
            }
            resolve();
        });
    }

    register() {
        return new Promise(async (resolve, reject) => {
            this.clearUp();
            await this.validate();

            if(this.errors.length === 0) {
                // Hash the user password so in the database we store the hashed one
                const salt = bcrypt.genSaltSync(10);
                this.data.password = bcrypt.hashSync(this.data.password, salt);
                await usersCollection.insertOne(this.data);
                this.getAvatar();
                resolve();
            }
            else {
                reject(this.errors);
            }
        });
    }

    getAvatar() {
        // The Gravatar uses md5 to hash the email address in the link to its avatar
        this.avatar = `https://gravatar.com/avatar/${md5(this.data.email)}?s=128`;
    }
}

// We don't need to instantiate a new object to call this function:
User.findByUsername = function(username) {
    return new Promise((resolve, reject) => {
        if(typeof(username) !== "string") {
            reject();
            return ;
        }
        usersCollection.findOne({ username })
            .then((userDoc) => {
                if(userDoc) {
                    // Modify the returned userDoc so it only contains necessary data.
                    userDoc = new User(userDoc, true);
                    userDoc = {
                        _id: userDoc.data._id,
                        username: userDoc.data.username,
                        avatar: userDoc.avatar
                    };
                    resolve(userDoc);
                }
                else {
                    reject();
                }
            })
            .catch(() => {
                reject();
            });
    });
}

module.exports = User;