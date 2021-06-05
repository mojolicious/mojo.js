/*
 * Minimal "Hello World" application with template for profiling
 */
'use strict';

const app = require('../lib/mojo')();

app.any('/hello', ctx => ctx.render({inline: hello}));

app.start();

const hello = `
Hello <%= 'World!' %>
`;
