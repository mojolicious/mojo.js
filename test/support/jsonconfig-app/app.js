'use strict';

const jsonConfigPlugin = require('../../../lib/plugins/json-config');
const mojo = require('../../../lib/mojo');

const app = module.exports = mojo();

app.log.level = 'debug';
app.config = {drink: 'Martini'};

app.plugin(jsonConfigPlugin);
app.plugin(jsonConfigPlugin, {file: 'does_not_exist.json'});

app.any('/', ctx => ctx.render({text: `My name is ${app.config.name}.`}));

app.start();
