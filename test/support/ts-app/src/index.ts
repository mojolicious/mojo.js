import mojo from '../../../../lib/core.js';

export const app = mojo();

app.log.level = 'info';

app.get('/', async ctx => {
  await ctx.render({text: 'Hello TypeScript!'});
});

app.get('/hello').to('foo#hello');

app.start().catch(null);
