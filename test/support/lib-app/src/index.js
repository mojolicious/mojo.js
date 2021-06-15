import mojo from '../../../../lib/mojo.js';

export const app = mojo();

app.log.level = 'debug';

app.any('/', ctx => ctx.render({text: 'src'}));

app.start();
