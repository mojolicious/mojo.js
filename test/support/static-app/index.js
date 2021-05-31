import mojo from '../../../lib/mojo.js';

export const app = mojo({developmentLogLevel: 'debug'});

app.any('/0').to(ctx => ctx.render({text: 'Zero'}));

app.start();
