const path = require('path');
const _ = require('lodash');
let credentials;
try {
  credentials = require('./credentials');
} catch(error) {
  console.log('Credentials are missing. Continuing without credentials.');
}

// All configurations will extend these options
// ============================================

const defaultPort = _.get(credentials, 'default.port', _.get(credentials, 'port', null)) || 9000;
module.exports = {
  env: process.env.NODE_ENV,

  // Root path of server
  root: path.normalize(__dirname + '/../../..'),

  // Server port
  port: process.env.PORT || defaultPort,
  yahoo: {
    key: _.get(credentials, 'default.yahoo.key', _.get(credentials, 'yahoo.key', null)),
    secret: _.get(credentials, 'default.yahoo.secret', _.get(credentials, 'yahoo.secret', null))
  },
  alpha: {
    key: _.get(credentials, 'default.alpha.key', _.get(credentials, 'alpha.key', null)),
  },
  tiingo: {
    key: _.get(credentials, 'default.tiingo.key', _.get(credentials, 'tiingo.key', null)),
  },
  robinhood: {
    deviceId: _.get(credentials, 'default.robinhood.deviceId', _.get(credentials, 'robinhood.deviceId', null)),
  },
  iex: {
    key: _.get(credentials, 'default.iex.key', _.get(credentials, 'iex.key', null)),
  },
  tdameritrade: {
    accountId: _.get(credentials, 'default.tdameritrade.accountId', _.get(credentials, 'tdameritrade.accountId', null)),
    consumer_key: _.get(credentials, 'default.tdameritrade.consumer_key', _.get(credentials, 'tdameritrade.consumer_key', null)),
    refresh_token: _.get(credentials, 'default.tdameritrade.refresh_token', _.get(credentials, 'tdameritrade.refresh_token', null))
  },
  apps: {
    goliath: _.get(credentials, 'default.goliathUrl', _.get(credentials, 'goliathUrl', null)),
    armadillo: _.get(credentials, 'default.armadilloUrl', _.get(credentials, 'armadilloUrl', null)),
    tiingo: 'https://api.tiingo.com/'
  },
  twilio: {
    key: _.get(credentials, 'default.twilio.key', _.get(credentials, 'twilio.key', null)),
    id: _.get(credentials, 'default.twilio.id', _.get(credentials, 'twilio.id', null)),
    num: _.get(credentials, 'default.twilio.num', _.get(credentials, 'twilio.num', null)),
  }
};
