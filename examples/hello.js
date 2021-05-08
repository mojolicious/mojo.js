/*
 * Minimal "Hello World" application for profiling
 */
import mojo from '../index.js';

const app = mojo();

app.any('/', ctx => ctx.render({text: 'Hello World!'}));

app.start();
