import {app} from './support/app-config/app-config.js';
import File from '../lib/file.js';
import jsonConfigPlugin from '../lib/plugins/json-config.js';
import mojo from '../lib/mojo.js';
import t from 'tap';

t.test('JSONConfig app', async t => {
  const client = await app.newTestClient({tap: t});

  await t.test('Named config file', async t => {
    t.same(app.config, {name: 'Bond. James Bond', drink: 'Martini', car: 'Aston Martin'});
    (await client.getOk('/')).statusIs(200).bodyIs('My name is Bond. James Bond.');
  });
  await client.stop();

  t.test('Default JSONConfig App', async t => {
    const app = mojo();
    app.config = {name: 'overridden', extra: 'option'};
    app.plugin(jsonConfigPlugin, {file: File.currentFile().dirname().child('support', 'named.json').toString()});
    t.same(app.config, {name: 'namedConfig', extra: 'option', deep: {option: ['deep']}});
    t.end();
  });
  t.test('Test overriding option by changing mode', async t => {
    const app = mojo({mode: 'test'});
    app.config = {name: 'overridden', extra: 'option'};
    app.plugin(jsonConfigPlugin, {file: File.currentFile().dirname().child('support', 'named.json').toString()});
    t.same(app.config, {name: 'namedConfig', extra: 'required', deep: {option: ['deep']}});
    t.end();
  });

  t.test('Missing config file', async t => {
    const app = mojo();
    t.throws(() => {
      app.plugin(jsonConfigPlugin(app, {file: 'missing.json'}));
    }, 'ENOENT: no such file or directory');
    t.end();
  });
});
