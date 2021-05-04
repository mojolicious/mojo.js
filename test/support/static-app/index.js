import mojo from '../../../index.js';

export const app = mojo();

app.any('/0').to(ctx => ctx.render({text: 'Zero'}));

app.start();
