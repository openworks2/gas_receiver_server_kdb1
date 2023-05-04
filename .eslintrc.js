module.exports = {
  extends: [
    'airbnb-base',
    'plugin:node/recommended',
    'eslint:recommended',
    'prettier',
  ],
  rules: {
    'no-unused-vars': [0],
    'node/no-unpublished-require': [
      'error',
      {
        allowModules: [],
        convertPath: null,
        tryExtensions: ['.js', '.json', '.node'],
      },
    ],
  },
};
