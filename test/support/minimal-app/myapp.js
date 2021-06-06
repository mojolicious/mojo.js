import mojo from '../../../lib/mojo.js';

export const app = mojo();

if (app.mode === 'development') app.log.level = 'debug';

app.any('/', ctx => ctx.render({text: 'Hello Mojo!'}));

app.start();
