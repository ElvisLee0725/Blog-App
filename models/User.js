const usersCollection = require('../db').collection('users');
const validator = require('validator');

class User {
    constructor(data) {
        this.data = data;
        this.errors = [];
    }

    clearUp() {
        const { username, email, password } = this.data;
    
        if(typeof(username) !== 'string') {
            username = '';
        }
        if(typeof(email) !== 'string') {
            email = '';
        }
        if(typeof(password) !== 'string') {
            password = '';
        }

        // Get rid of extra data input by user, only keep username, email and password
        this.data = {
            username: username.trim().toLowerCase(),
            email: email.trim().toLowerCase(),
            password
        };
    }

    validate() {
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

        if(password.length > 100) {
            this.errors.push("Password cannot be over 100 characters");
        }

        if(username.length > 0 && username.length < 3) {
            this.errors.push("Username must be at least 3 characters");
        }

        if(username.length > 30) {
            this.errors.push("Username cannot be over 30 characters");
        }
    }

    register() {
        this.clearUp();
        this.validate();

        if(this.errors.length === 0) {
            usersCollection.insertOne(this.data);
        }
    }
}

module.exports = User;