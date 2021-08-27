import mojo from '../../../../lib/core.js';

export const app = mojo();

app.log.level = 'debug';

app.any('/', ctx => ctx.render({text: 'none'}));

app.start();
