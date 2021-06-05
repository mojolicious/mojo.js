/*
 * Minimal "Hello World" application with template for profiling
 */
'use strict';

const mojo = require('../lib/mojo');

const app = mojo();

app.any('/hello', ctx => ctx.render({inline: hello}));

app.start();

const hello = `
Hello <%= 'World!' %>
`;
