'use strict';

const mojo = require('../../../lib/mojo');

const app = module.exports = mojo();

if (app.mode === 'development') app.log.level = 'debug';

app.any('/0').to(ctx => ctx.render({text: 'Zero'}));

app.start();
