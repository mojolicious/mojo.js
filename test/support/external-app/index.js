import mojo from '../../../index.js';

export const app = mojo();

app.any('/', ctx => ctx.render({text: 'Hello Mojo!'}));

app.any('/foo').to('foo#bar');

app.start();
