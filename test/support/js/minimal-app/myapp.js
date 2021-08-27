import mojo from '../../../../lib/core.js';

export const app = mojo();

if (app.mode === 'development') app.log.level = 'debug';

app.any('/', ctx => ctx.render({text: 'Hello Mojo!'}));

app.start();
