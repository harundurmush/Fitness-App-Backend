// app.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const planRoutes = require('./routes/planRoutes');
const logRoutes = require('./routes/logRoutes');
const exerciseRoutes = require('./routes/exerciseRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes'); // NEW

const app = express();

app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/api/plan', planRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/favorites', favoriteRoutes); // NEW

module.exports = app;
