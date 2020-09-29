/* eslint-env node */
'use strict';

module.exports = {
  extends: 'recommended',

  rules: {
    'no-bare-strings': true,
    'quotes': 'double'
  },
  ignore: [
    '**/tests/dummy/**'
  ]
};
