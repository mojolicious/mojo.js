import mojo from '../../../../lib/core.js';

export const app = mojo();

if (app.mode === 'development') app.log.level = 'debug';

app.any('/0').to(ctx => ctx.render({text: 'Zero'}));

app.any('/static/hello.txt', async ctx => {
  await ctx.render({text: `Route: ${ctx.req.method}`});
});

app.start();
