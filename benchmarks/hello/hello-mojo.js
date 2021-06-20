import mojo from '../../lib/core.js';

const app = mojo();

app.any('/', ctx => ctx.render({text: 'Hello World!'}));

app.start();
