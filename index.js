require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT;
const { mongodb } = require('./mongo');
const bodyParser = require('body-parser');
const passport = require('passport');
const session = require('express-session');
const startTimers = require('./js/timers');
const path = require('path');

// Connect to database
mongodb.then(() => { console.log('Connected to database') }).catch(err => console.error(`${path.basename(__filename)} There was a problem connecting to the database: `, err));

startTimers();

app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

app.use(session({
    secret: 'some secret',
    saveUninitialized: false,
    resave: false
}));
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', [
    path.join(__dirname, '/views')
]);

// Routes
const auth = require('./routes/auth');
const error = require('./routes/error');
const success = require('./routes/success');
const api = require('./routes/api');
app.use('/auth', auth);
app.use('/error', error);
app.use('/success', success);
app.use('/api', api);

app.listen(port, () => {
    console.log(`Listening on port: ${port}`);
});