import mojo from '../../lib/mojo.js';

const app = mojo();

app.any('/', ctx => ctx.render({text: 'Hello World!'}));

app.start();
