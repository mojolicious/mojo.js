'use strict';

const mojo = require('../../../lib/mojo');

const app = module.exports = mojo();

if (app.mode === 'development') app.log.level = 'debug';

app.any('/', ctx => ctx.render({text: 'Hello Mojo!'}));

app.start();
