import mojo from '../../../index.js';

export const app = mojo();

app.any('/', ctx => ctx.render({text: 'Hello Mojo!'}));

app.start();
