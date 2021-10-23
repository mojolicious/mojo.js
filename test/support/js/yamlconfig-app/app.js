import mojo, {yamlConfigPlugin} from '../../../../lib/core.js';

export const app = mojo();

app.log.level = 'debug';
app.config = {drink: 'Martini'};

app.plugin(yamlConfigPlugin);
app.plugin(yamlConfigPlugin, {file: 'does_not_exist.yml'});

app.any('/', ctx => ctx.render({text: `My name is ${app.config.name}.`}));

app.start();
