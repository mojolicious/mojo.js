/*
 * Application demonstrating the various HTTP response variants for debugging
 */
import {Stream} from 'node:stream';
import mojo from '../lib/core.js';

const app = mojo();

app.get('/res1', ctx => {
  return ctx.render({text: 'Hello World!'});
});

app.get('/res2', async ctx => {
  await ctx.res.length(11).send(Stream.Readable.from(['Hello', 'World!']));
});

app.get('/res3', async ctx => {
  ctx.res.set('Transfer-Encoding', 'chunked');
  await ctx.res.send(Stream.Readable.from(['Hello', 'World!']));
});

app.get('/res4', ctx => {
  return ctx.render({text: '', status: 204});
});

app.get('/res5', () => {
  throw new Error('Hello World!');
});

app.get('/res6', ctx => {
  return ctx.render({inline: "<% throw new Error('Hello World!') %>"});
});

app.get('/res7', ctx => {
  return ctx.res.status(200).send('Hello World!');
});

app.get('/res8', ctx => {
  return ctx.render({json: {hello: 'world'}});
});

app.get('/res9', async () => {
  function myAsyncFunction() {
    return new Promise(() => {
      throw 'Just a string!';
    });
  }

  await myAsyncFunction();
});

app.start();
