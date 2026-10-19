import mojo from '../../src/core.ts';

const app = mojo();

app.any('/', ctx => ctx.render({text: 'Hello World!'}));

app.start();
