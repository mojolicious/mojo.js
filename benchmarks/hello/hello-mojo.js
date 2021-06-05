'use strict';

const app = require('../../lib/mojo')();

app.any('/', ctx => ctx.render({text: 'Hello World!'}));

app.start();
