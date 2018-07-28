const path = require('path');
const _ = require('lodash');
const fs = require('fs');

let credentials = {}

try {
  const stats = fs.statSync('./server/config/environment/credentials.js');
  credentials = require('./credentials');
}
catch(err) {
    console.log('Credentials are missing. Continuing without credentials.');
}

function requiredProcessEnv(name) {
  if(!process.env[name]) {
    throw new Error('You must set the ' + name + ' environment variable');
  }
  return process.env[name];
}

// All configurations will extend these options
// ============================================
const all = {
  env: process.env.NODE_ENV,

  // Root path of server
  root: path.normalize(__dirname + '/../../..'),

  // Server port
  port: process.env.PORT || 9000,
  yahoo: {
    key: _.get(credentials, 'yahoo.key', null),
    secret: _.get(credentials, 'yahoo.secret', null)
  },
  apps: {
    goliath: 'http://localhost:8100/'
  }
};

// Export the config object based on the NODE_ENV
// ==============================================
module.exports = _.merge(
  all,
  require('./' + process.env.NODE_ENV + '.js') || {});
