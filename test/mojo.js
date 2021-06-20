import mojo, {Client, File, jsonConfigPlugin, Logger, Server, Session, TestClient, util} from '../lib/core.js';
import t from 'tap';

t.test('Public API', async t => {
  t.test('mojo', t => {
    t.ok(mojo instanceof Function);
    const app = mojo();
    t.ok(app.handleRequest instanceof Function);
    t.end();
  });

  t.test('jsonConfigPlugin', t => {
    t.ok(jsonConfigPlugin instanceof Function);
    t.end();
  });

  t.test('util', t => {
    t.ok(util !== undefined);
    t.ok(util.tablify instanceof Function);
    t.end();
  });

  t.test('Client', t => {
    t.ok(Client !== undefined);
    const client = new Client();
    t.ok(client.request instanceof Function);
    t.end();
  });

  t.test('File', t => {
    t.ok(File !== undefined);
    const file = new File();
    t.ok(file.sibling instanceof Function);
    t.end();
  });

  t.test('Logger', t => {
    t.ok(Logger !== undefined);
    const log = new Logger();
    t.ok(log.debug instanceof Function);
    t.end();
  });

  t.test('Server', t => {
    t.ok(Server !== undefined);
    t.ok(Server.listenArgsForURL instanceof Function);
    t.end();
  });

  t.test('Session', t => {
    t.ok(Session !== undefined);
    t.ok(Session.encrypt instanceof Function);
    t.end();
  });

  t.test('TestClient', t => {
    t.ok(TestClient !== undefined);
    const client = new TestClient();
    t.ok(client.getOk instanceof Function);
    t.end();
  });
});
