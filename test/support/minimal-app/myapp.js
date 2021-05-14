import mojo from '../../../lib/mojo.js';

export const app = mojo();

app.any('/', ctx => ctx.render({text: 'Hello Mojo!'}));

app.start();
