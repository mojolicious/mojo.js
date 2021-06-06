import mojo from '../../../lib/mojo.js';

export const app = mojo();

if (app.mode === 'development') app.log.level = 'debug';

app.any('/0').to(ctx => ctx.render({text: 'Zero'}));

app.start();
