const path = require('path');
const _ = require('lodash');

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
    key: 'dj0yJmk9TUdJOGpUZms0OUl2JmQ9WVdrOVlVdFFWazF3TkdzbWNHbzlNQS0tJnM9Y29uc3VtZXJzZWNyZXQmeD04Mw--',
    secret: 'a46cf2610a81dceb6a9306fda66dcfc767e76055'
  } 
};

// Export the config object based on the NODE_ENV
// ==============================================
module.exports = _.merge(
  all,
  require('./' + process.env.NODE_ENV + '.js') || {});
