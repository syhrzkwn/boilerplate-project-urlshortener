require('dotenv').config();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dns = require('dns');
const { URL } = require('url');
const express = require('express');
const cors = require('cors');
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { 
  serverApi: { version: '1', strict: true, deprecationErrors: true }})
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error(err);
  });

// Middleware
app.use(cors());
app.use('/public', express.static(`${process.cwd()}/public`));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Model
const Schema = mongoose.Schema;

const urlSchema = new Schema({
  originalUrl: { type: String, required: true },
  shortUrl: { type: Number, required: true, unique: true }
});

const Url = mongoose.model('Url', urlSchema);

// Counter schema for generating unique shortUrl
const counterSchema = new Schema({
  _id: { type: String, required: true },
  sequence_value: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', counterSchema);

// WEB
app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

// API ShortURL to create short url
app.post('/api/shorturl', async (req, res) => {
  const { url: originalUrl } = req.body;

  try {
    const parsedURL = new URL(originalUrl);
    const hostname = parsedURL.hostname;

    // Validate URL format
    const httpRegex = /^(http|https)(:\/\/)/; 
    if (!httpRegex.test(originalUrl)) {
      return res.json({ error: 'Invalid URL' })
    }

    dns.lookup(hostname, async (err) => {
      if (err) { 
        return res.json({ error: 'Invalid Hostname' });
      }

      // Generate unique shortUrl
      const counter = await Counter.findOneAndUpdate(
        { _id: 'shortUrlCounter' },
        { $inc: { sequence_value: 1 } },
        { upsert: true, new: true }
      );
      const shortUrl = counter.sequence_value;

      // Save the URL with the generated shortUrl
      const newUrl = new Url({ originalUrl, shortUrl });
      await newUrl.save();

      res.json({
        original_url: originalUrl,
        short_url: shortUrl
      });
    });
  } catch (e) {
    return res.json({ error: 'Invalid URL' });
  }
});

// API ShortURL to redirect to original URL
app.get('/api/shorturl/:shortUrl', async (req, res) => {
  const { shortUrl } = req.params;

  try {
    const url = await Url.findOne({ shortUrl });

    if (url) {
      res.redirect(url.originalUrl);
    } else {
      res.json({ error: 'No short URL found for the given input' });
    }
  } catch (e) {
    res.json({ error: 'Server Error' });
  }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
