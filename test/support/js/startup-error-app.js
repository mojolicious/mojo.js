import mojo from '../../../src/core.ts';

const app = mojo();

app.get('/', ctx => ctx.render({text: 'Hello World'}));

app.onStart(async () => {
  throw new Error('Intentional startup error');
});

app.start();
