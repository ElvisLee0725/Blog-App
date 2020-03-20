const mongodb = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();

const connectString = `mongodb+srv://${process.env.MONGODB_AUTH}@cluster0-nlkvn.mongodb.net/BlogApp?retryWrites=true&w=majority`;

mongodb.connect(connectString, { useNewUrlParser: true, useUnifiedTopology: true }, (err, client) => {
    module.exports = client.db();
    const app = require('./app');
    app.listen(process.env.PORT);
  });