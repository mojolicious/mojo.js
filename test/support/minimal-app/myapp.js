import mojo from '../../../lib/mojo.js';

export const app = mojo({developmentLogLevel: 'debug'});

app.any('/', ctx => ctx.render({text: 'Hello Mojo!'}));

app.start();
