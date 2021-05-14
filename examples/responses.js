/*
 * Application demonstrating the various HTTP response variants for debugging
 */
import mojo from '../lib/mojo.js';

const app = mojo();

app.get('/res1', ctx => {
  ctx.render({text: 'Hello World!'});
});

app.get('/res2', ctx => {
  ctx.res.write('Hello ');
  ctx.res.write('World!');
  ctx.res.end();
});

app.get('/res3', ctx => {
  ctx.render({text: '', status: 204});
});

app.get('/res4', ctx => {
  throw new Error('Hello World!');
});

app.get('/res5', ctx => {
  ctx.render({inline: "<% throw new Error('Hello World!') %>"});
});

app.start();
