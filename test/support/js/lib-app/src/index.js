import mojo from '../../../../../src/core.ts';

export const app = mojo();

app.log.level = 'debug';

app.any('/', ctx => ctx.render({text: 'src'}));

app.start();
