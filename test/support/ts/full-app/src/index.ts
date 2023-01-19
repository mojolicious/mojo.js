import {Bar} from './models/bar.js';
import helpersPlugin from './plugins/helpers.js';
import mojo, {yamlConfigPlugin} from '../../../../../lib/core.js';

export const app = mojo();

app.log.level = 'info';

app.models.bar = new Bar();

app.plugin(yamlConfigPlugin);
app.plugin(helpersPlugin);

app.decorateContext('helloWorld', {get: () => 'Hello Test!'});

app.get('/', async ctx => {
  const language: string = ctx.models.bar.language();
  await ctx.render({text: `Hello ${language}!`});
});

app.get('/hello').to('foo#hello');

app.put('/echo/json').to('foo#jsonEcho');
app.post('/echo/form').to('foo#formEcho');

app.get('/decorate/hello', ctx => ctx.res.send(ctx.helloWorld));

app.start();
