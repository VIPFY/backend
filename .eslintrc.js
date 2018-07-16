module.exports = {
  plugins: ["import"],
  extends: "airbnb-base",
  env: {
    node: true,
    es6: true
  },
  rules: {
    "implicit-arrow-linebreak": "off",
    "function-paren-newline": "off",
    "no-else-return": "off",
    "operator-linebreak": "off",
    "object-curly-newline": "off",
    eqeqeq: "off",
    "func-names": "off",
    "arrow-parens": "off",
    camelcase: "off",
    "no-console": "off",
    "comma-dangle": "off",
    quotes: [2, "double", { allowTemplateLiterals: true }],
    "no-new": "off",
    "no-plusplus": "off",
    "no-param-reassign": "off",
    radix: "off"
  },
  globals: {
    describe: 1,
    test: 1,
    expect: 1,
    beforeAll: 1,
    afterAll: 1,
    jest: 1
  }
};
