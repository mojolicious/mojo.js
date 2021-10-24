import mojo, {jsonConfigPlugin} from '../../../../lib/core.js';

export const app = mojo();

app.log.level = 'debug';
app.config = {drink: 'Martini'};

app.plugin(jsonConfigPlugin);
app.plugin(jsonConfigPlugin, {ext: 'conf'});
app.plugin(jsonConfigPlugin, {file: 'does_not_exist.json'});

app.any('/', ctx => ctx.render({text: `My name is ${app.config.name}.`}));

app.start();
