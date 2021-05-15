import jsonConfigPlugin from '../../../lib/plugins/json-config.js';
import mojo from '../../../lib/mojo.js';

export const app = mojo();

app.config = {drink: 'Martini'};
app.plugin(jsonConfigPlugin);

app.any('/', ctx => ctx.render({text: `My name is ${app.config.name}.`}));

app.start();
