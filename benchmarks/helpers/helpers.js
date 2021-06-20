import mojo from '../../lib/core.js';

const app = mojo();

app.addHelper('test', ctx => {
  return ctx;
});

app.any('/', ctx => {
  for (let i = 0; i < 100000000; i++) {
    ctx.test();
  }
  ctx.render({text: 'Hello World!'});
});

app.start();
