'use strict';

const app = require('./support/jsonconfig-app/app');
const File = require('../lib/file');
const jsonConfigPlugin = require('../lib/plugins/json-config');
const mojo = require('../lib/mojo');
const t = require('tap');

t.test('JSONConfig app', async t => {
  const client = await app.newTestClient({tap: t});

  await t.test('External app with config', async t => {
    t.same(app.config, {name: 'Bond. James Bond', drink: 'Martini', car: 'Aston Martin'});
    (await client.getOk('/')).statusIs(200).bodyIs('My name is Bond. James Bond.');
  });

  await client.stop();

  t.test('Named config file', t => {
    const app = mojo();
    app.log.level = 'debug';
    app.config = {name: 'overridden', extra: 'option'};
    const file = File.currentFile().dirname().child('support', 'jsonconfig-app', 'custom', 'named.json').toString();
    app.plugin(jsonConfigPlugin, {file});
    t.same(app.config, {name: 'namedConfig', extra: 'option', deep: {option: ['deep']}});
    t.end();
  });

  t.test('Named config file with custom mode', t => {
    const app = mojo({mode: 'test'});
    app.config = {name: 'overridden', extra: 'option'};
    const file = File.currentFile().dirname().child('support', 'jsonconfig-app', 'custom', 'named.json').toString();
    app.plugin(jsonConfigPlugin, {file});
    t.same(app.config, {name: 'namedConfig', extra: 'required', deep: {option: ['deep']}});
    t.end();
  });
});
