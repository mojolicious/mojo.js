import mojo from '../lib/mojo.js';
import t from 'tap';

t.test('Public API', async t => {
  t.test('mojo', t => {
    t.ok(mojo instanceof Function);
    const app = mojo();
    t.ok(app.handleRequest instanceof Function);
    t.end();
  });

  t.test('mojo.jsonConfigPlugin', t => {
    t.ok(mojo.jsonConfigPlugin instanceof Function);
    t.end();
  });

  t.test('mojo.util', t => {
    t.ok(mojo.util !== undefined);
    t.ok(mojo.util.tablify instanceof Function);
    t.end();
  });

  t.test('mojo.Client', t => {
    t.ok(mojo.Client !== undefined);
    const client = new mojo.Client();
    t.ok(client.request instanceof Function);
    t.end();
  });

  t.test('mojo.File', t => {
    t.ok(mojo.File !== undefined);
    const file = new mojo.File();
    t.ok(file.sibling instanceof Function);
    t.end();
  });

  t.test('mojo.Logger', t => {
    t.ok(mojo.Logger !== undefined);
    const log = new mojo.Logger();
    t.ok(log.debug instanceof Function);
    t.end();
  });
});
