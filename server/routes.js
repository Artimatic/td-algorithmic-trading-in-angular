/**
 * Main application routes
 */
const express = require('express');
const path = require('path');

module.exports = function(app) {
  // Insert routes below
  app.use('/dist', express.static(path.join(__dirname, '../dist')));
  app.use('/public', express.static(path.join(__dirname, '../public')));
  app.use('/api/quote', require('./api/quote'));
  app.use('/api/mean-reversion', require('./api/mean-reversion'));

  app.route('/*')
    .get(function(req, res) {
        res.sendfile(app.get('appPath') + '/app.index.html');
  });
};
