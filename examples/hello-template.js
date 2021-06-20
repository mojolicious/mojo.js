/*
 * Minimal "Hello World" application with template for profiling
 */
import mojo from '../lib/core.js';

const app = mojo();

app.any('/hello', ctx => ctx.render({inline: hello}));

app.start();

const hello = `
Hello <%= 'World!' %>
`;
