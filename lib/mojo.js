/*!
 * mojo.js
 * Copyright (C) 2021 Sebastian Riedel
 * MIT Licensed
 */
'use strict';

const util = require('./util');
const App = require('./app');

function mojo () {
  return new App();
}

exports = module.exports = mojo;
exports.mojo = mojo;
exports.util = util;
exports.version = require('../package.json').version;
exports.File = require('./file');
exports.Pattern = require('./router/pattern');
exports.Router = require('./router');
