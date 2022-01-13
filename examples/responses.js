/*
 * Application demonstrating the various HTTP response variants for debugging
 */
import mojo from '../lib/core.js';

const app = mojo();

app.get('/res1', ctx => {
  return ctx.render({text: 'Hello World!'});
});

app.get('/res2', ctx => {
  ctx.res.raw.write('Hello ');
  ctx.res.raw.write('World!');
  ctx.res.raw.end();
});

app.get('/res3', ctx => {
  return ctx.render({text: '', status: 204});
});

app.get('/res4', () => {
  throw new Error('Hello World!');
});

app.get('/res5', ctx => {
  return ctx.render({inline: "<% throw new Error('Hello World!') %>"});
});

app.get('/res6', ctx => {
  return ctx.res.status(200).send('Hello World!');
});

app.get('/res7', ctx => {
  return ctx.render({json: {hello: 'world'}});
});

app.get('/res8', async () => {
  function myAsyncFunction() {
    return new Promise(() => {
      throw 'Just a string!';
    });
  }

  await myAsyncFunction();
});

app.start();
