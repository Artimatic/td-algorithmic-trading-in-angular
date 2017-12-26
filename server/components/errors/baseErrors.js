const errors = require('errors');

module.exports.InvalidArgumentsError = errors.create({
    name:"InvalidArgumentsError",
    defaultExplanation: "Input has invalid value"
});

module.exports.NotFoundError = errors.create({
  name:"NotFoundError",
  defaultExplanation: "Not found"
});
