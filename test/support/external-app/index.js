import mojo from '../../../index.js';

export const app = mojo();

app.any('/', ctx => ctx.render({text: 'Hello Mojo!'}));

app.any('/foo').to('foo#works');

app.put('/bar').to('bar#jsonReturn');

app.start();
