// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.
import * as credentials from './client-config';
import * as _ from 'lodash';

const goliathDataServiceUrl = _.get(credentials,
  'default.goliathDataServiceUrl', _.get(credentials, 'goliathDataServiceUrl', null)) || 9000;
const armidilloMlServiceUrl = _.get(credentials,
  'default.goliathDataServiceUrl', _.get(credentials, 'goliathDataServiceUrl', null)) || 9000;

export const environment = {
  production: false,
  envName: 'dev',
  appUrl: '/',
  goliathDataServiceUrl,
  armidilloMlServiceUrl
};
