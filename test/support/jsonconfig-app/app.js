import jsonConfigPlugin from '../../../lib/plugins/json-config.js';
import mojo from '../../../lib/mojo.js';

export const app = mojo();

app.log.level = 'debug';
app.config = {drink: 'Martini'};

app.plugin(jsonConfigPlugin);
app.plugin(jsonConfigPlugin, {file: 'does_not_exist.json'});

app.any('/', ctx => ctx.render({text: `My name is ${app.config.name}.`}));

app.start();
