const express = require('express');
const app = express();
const router = require('./router');

app.use(express.urlencoded({extended: false})); // Tell Express to add user input data to req.body so we can use
app.use(express.json());    // Send over json

app.use(express.static('public'));  // Use public folder for styles
app.set('views', 'views');  // 2nd argument is the folder to store views
app.set('view engine', 'ejs');

app.use('/', router);

module.exports = app;