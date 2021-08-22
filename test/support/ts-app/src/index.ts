import mojo from '../../../../lib/core.js';
import {Bar} from './models/bar.js';
import helpersPlugin from './plugins/helpers.js';

export const app = mojo();

app.log.level = 'info';

app.models.bar = new Bar();

app.plugin(helpersPlugin);

app.get('/', async ctx => {
  const language: string = ctx.models.bar.language();
  await ctx.render({text: `Hello ${language}!`});
});

app.get('/hello').to('foo#hello');

app.get('/hello-name', async ctx => {
  const name = (await ctx.params()).get('name');
  await ctx.render({text: `Hello ${name}!`});
});

app.post('/data', async ctx => {
  const body: any = await ctx.req.json();
  await ctx.render({json : {greeting: `Hello ${body.name}`}});
});

app.get('/data/:id', async ctx => {
  const id = ctx.stash.id;
  await ctx.render({json: {id}});
});

app.start();
