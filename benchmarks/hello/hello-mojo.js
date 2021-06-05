'use strict';

const mojo = require('../../lib/mojo');

const app = mojo();

app.any('/', ctx => ctx.render({text: 'Hello World!'}));

app.start();
