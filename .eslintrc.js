module.exports = {
  "plugins": ["import"],
  "extends": "airbnb-base",
  "rules": {
    "eqeqeq": "off",
    "func-names": "off",
    "arrow-parens": "off",
    "camelcase": "off",
    "no-console": "off",
    "comma-dangle": "off",
    'quotes': [2, 'double', {'allowTemplateLiterals': true}],
    "no-new": "off",
  },
  // Allow global functions for testing to avoid unnecessary warnings
  "globals": {
    "describe": 1,
    "test": 1,
    "expect": 1,
    "beforeAll": 1,
    "afterAll": 1,
    "jest": 1
  }
};
