/**
 * Main application routes
 */
const express = require('express');
const path = require('path');

module.exports = function(app) {
  // Insert routes below
  app.use('/api/quote', require('./api/quote'));
  app.use('/api/mean-reversion', require('./api/mean-reversion'));
  app.use('/api/backtest', require('./api/backtest'));
  app.use('/api/portfolio', require('./api/portfolio'));

  app.route('/*')
    .get(function(req, res) {
        res.sendfile(app.get('appPath') + '/index.html');
  });
};
