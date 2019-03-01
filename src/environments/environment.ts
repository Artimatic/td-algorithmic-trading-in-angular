// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.
import * as credentials from '../../server/config/environment/credentials';
import * as _ from 'lodash';

const defaultPort = _.get(credentials, 'default.port', _.get(credentials, 'port', null)) || 9000;

export const environment = {
  production: false,
  envName: 'dev',
  appUrl: `http://localhost:${defaultPort}/`
};
