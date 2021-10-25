import mojo, {
  jsonConfigPlugin,
  yamlConfigPlugin,
  util,
  Logger,
  Server,
  Session,
  TestUserAgent,
  UserAgent
} from '../lib/core.js';
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

  t.test('yamlConfigPlugin', t => {
    t.ok(yamlConfigPlugin instanceof Function);
    t.end();
  });

  t.test('util', t => {
    t.ok(util !== undefined);
    t.ok(util.tablify instanceof Function);
    t.end();
  });

  t.test('UserAgent', t => {
    t.ok(UserAgent !== undefined);
    const ua = new UserAgent();
    t.ok(ua.request instanceof Function);
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

  t.test('TestUserAgent', t => {
    t.ok(TestUserAgent !== undefined);
    const ua = new TestUserAgent();
    t.ok(ua.getOk instanceof Function);
    t.end();
  });
});
