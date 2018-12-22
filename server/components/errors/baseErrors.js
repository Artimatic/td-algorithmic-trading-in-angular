const errors = require('errors');

class BaseErrors {
  InvalidArgumentsError() {
    return errors.create({
      name: 'InvalidArgumentsError',
      defaultExplanation: 'Input has invalid value'
    });
  }

  NotFoundError() {
    return errors.create({
      name: 'NotFoundError',
      defaultExplanation: 'Not found'
    });
  }

  Http400Error(err) {
    return new errors.Http400Error(err);
  }
}

export default new BaseErrors();
