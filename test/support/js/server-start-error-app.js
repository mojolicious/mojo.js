import mojo from '../../../lib/core.js';

const app = mojo();

app.get('/', ctx => ctx.render({text: 'Hello World'}));

app.addAppHook('server:start', async () => {
  throw new Error('server:start hook error');
});

app.start();
