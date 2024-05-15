require('dotenv').config();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dns = require('dns');
const { URL } = require('url');
const express = require('express');
const cors = require('cors');
const app = express();
const shortid = require('shortid');

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

const urlScheme = new Schema({
  originalUrl: { type: String, required: true },
  shortUrl: { type: String, required: true, unique: true }
});

const Url = mongoose.model('Url', urlScheme);

// WEB
app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

// API ShortURL to create short url
app.post('/api/shorturl', (req, res) => {
  const { url: originalUrl } = req.body;

  // Validate URL format with stricter regex
  const urlRegex = /^(https?:\/\/)(www\.)?[a-zA-Z0-9-]{1,256}\.[a-zA-Z]{2,6}(\/.*)?$/;
  if (!urlRegex.test(originalUrl)) {
    return res.status(400).json({ error: 'invalid url' });
  }

  try {
    const parsedURL = new URL(originalUrl);
    const hostname = parsedURL.hostname;

    dns.lookup(hostname, async (err) => {
      if (err) { 
        return res.status(400).json({error: 'invalid hostname'});
      }

      const shortUrl = shortid.generate();
      const newUrl = new Url({ originalUrl, shortUrl });

      await newUrl.save();

      res.json({
        original_url: originalUrl,
        short_url: shortUrl
      });
    });
  } catch (e) {
    return res.status(400).json({error: 'invalid url'});
  }
});

// API ShortURL to create short url
app.get('/api/shortUrl/:shortUrl', async (req, res) => {
  const { shortUrl } = req.params;

  try {
    const url = await Url.findOne({ shortUrl });

    if (url) {
      res.redirect(url.originalUrl);
    } else {
      res.status(404).json({ error: 'No short URL found for the given input' });
    }
  } catch (e) {
    res.status(500).json({error: 'Server Error'});
  }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
