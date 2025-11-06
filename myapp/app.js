var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mongoose = require('mongoose');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// This is to enable cross-origin access
app.use(function (req, res, next) {
   // Website you wish to allow to connect
   res.setHeader('Access-Control-Allow-Origin', '*');
   // Request methods you wish to allow
   res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
   // Request headers you wish to allow
   res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
   // Set to true if you need the website to include cookies in the requests sent
   // to the API (e.g. in case you use sessions)
   res.setHeader('Access-Control-Allow-Credentials', true);
   // Pass to next layer of middleware
   next();
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lab6';
mongoose.connect(mongoUri)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err.message));

// Schema
const Recording = mongoose.model('Recording', new mongoose.Schema({
  zip: { type: Number },
  airQuality: { type: Number }
}));

// /lab/status GET endpoint
app.get('/lab/status', async (req, res) => {
  const zip = req.query.zip;
  if (!zip || isNaN(Number(zip))) {
    var errormsg = { "error": "a zip code is required." };
    return res.status(400).json(errormsg);
  }
  try {
    const zipNum = Number(zip);
    const docs = await Recording.find({ zip: zipNum }).select('airQuality -_id').lean();
    if (!docs || docs.length === 0) {
      var errormsg = { "error": "Zip does not exist in the database." };
      return res.status(400).json(errormsg);
    }
    const sum = docs.reduce((s, d) => s + (d.airQuality || 0), 0);
    const avg = sum / docs.length;
    const avgStr = avg.toFixed(2);
    return res.status(200).json(avgStr);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// /lab/register POST endpoint
app.post('/lab/register', async (req, res) => {
  const { zip, airQuality } = req.body || {};
  if (zip === undefined || airQuality === undefined) {
    var errormsg = { "error": "zip and airQuality are required." };
    return res.status(400).json(errormsg);
  }
  const zipNum = Number(zip);
  const aqNum = Number(airQuality);
  // Accept numeric strings; if not numeric, still treat as provided per spec
  try {
    const rec = new Recording({ zip: zipNum, airQuality: aqNum });
    await rec.save();
    var msg = { "response": "Data recorded." };
    return res.status(201).json(msg);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
