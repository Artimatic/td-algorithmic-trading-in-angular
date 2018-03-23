const path = require('path');
const _ = require('lodash');
var fs = require('fs');
var credentials;
if (fs.existsSync('./credentials')) {
  credentials = require('./credentials');
}

function requiredProcessEnv(name) {
  if(!process.env[name]) {
    throw new Error('You must set the ' + name + ' environment variable');
  }
  return process.env[name];
}

// All configurations will extend these options
// ============================================
var all = {
  env: process.env.NODE_ENV,

  // Root path of server
  root: path.normalize(__dirname + '/../../..'),

  // Server port
  port: process.env.PORT || 9000,
  yahoo: {
    key: _.get(credentials, 'yahoo.key', null),
    secret: _.get(credentials, 'yahoo.key', null)
  }
};

// Export the config object based on the NODE_ENV
// ==============================================
module.exports = _.merge(
  all,
  require('./' + process.env.NODE_ENV + '.js') || {});
