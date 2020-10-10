/**
 * Express configuration
 */
const express = require('express');
const favicon = require('serve-favicon');
const morgan = require('morgan');
const compression = require('compression');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser');
const errorHandler = require('errorhandler');
const path = require('path');
const configurations = require('./environment');


module.exports = function(app) {
  const env = app.get('env');

  app.set('views', configurations.root + '/server/views');
  app.set('view engine', 'html');
  app.use(compression());
  app.use(bodyParser.json({limit: '50mb'}));
  app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
  app.use(methodOverride());
  app.use(cookieParser());

  if ('production' === env) {
    app.use(express.static(path.join(configurations.root, 'dist')));
    app.set('appPath', 'dist');
    app.use(morgan('dev'));
    app.use(errorHandler()); // Error handler - has to be last
  }

  if ('development' === env || 'test' === env) {
    app.use(express.static(path.join(configurations.root, 'dist')));
    app.set('appPath', 'dist');
    app.use(morgan('dev'));
    app.use(errorHandler()); // Error handler - has to be last
  }
};
