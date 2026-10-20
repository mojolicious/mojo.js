import http from 'node:http';
import {PassThrough, Readable} from 'node:stream';
import mojo, {Logger, Server} from '../src/core.ts';
import {captureOutput} from '@mojojs/util';
import t from 'tap';

t.test('Server', async t => {
  const app = mojo({mode: 'production'});

  app.get('/', ctx => ctx.render({text: 'Hello World!'}));

  app.get('/teapot', ctx => ctx.render({text: 'Teapot!', status: 418}));

  app.get('/stream/error', async ctx => {
    const stream = new Readable({
      read() {
        this.push('Hello');
        this.destroy(new Error('Stream error'));
      }
    });
    await ctx.res.status(200).send(stream);
  });

  app.get('/bad/status', ctx => ctx.res.status('invalid').send());

  let aborted;
  app.get('/stream/abort', async ctx => {
    aborted = new Readable({
      read() {
        this.push('x'.repeat(1024));
      }
    });
    await ctx.res.status(200).send(aborted);
  });

  t.test('listenArgsforURL', t => {
    t.same(Server.listenArgsForURL(new URL('http://*')), [null, '0.0.0.0']);
    t.same(Server.listenArgsForURL(new URL('http://*:3000')), [3000, '0.0.0.0']);
    t.same(Server.listenArgsForURL(new URL('http://*:4000')), [4000, '0.0.0.0']);
    t.same(Server.listenArgsForURL(new URL('http://0.0.0.0:8000')), [8000, '0.0.0.0']);
    t.same(Server.listenArgsForURL(new URL('http://127.0.0.1:8080')), [8080, '127.0.0.1']);

    t.same(Server.listenArgsForURL(new URL('http://*?fd=3')), [{fd: 3}]);
    t.same(Server.listenArgsForURL(new URL('http://[::1]:5000')), [5000, '::1']);

    t.same(Server.listenArgsForURL(new URL(`http+unix:///var/run/myapp.sock`)), [{path: '/var/run/myapp.sock'}]);
    t.same(Server.listenArgsForURL(new URL(`http+unix://foo:23/myapp.sock`)), [{path: 'foo:23/myapp.sock'}]);
    t.same(Server.listenArgsForURL(new URL(`http+unix://myapp.sock`)), [{path: 'myapp.sock'}]);
    t.same(Server.listenArgsForURL(new URL(`http+unix://foo/bar.sock`)), [{path: 'foo/bar.sock'}]);

    t.end();
  });

  await t.test('Teapot', async t => {
    const ua = await app.newTestUserAgent({tap: t});

    (await ua.getOk('/teapot')).statusIs(418);
    t.equal(ua.res.statusMessage, "I'm a Teapot");

    await ua.stop();
  });

  await t.test('MOJO_SERVER_DEBUG', async t => {
    process.env.MOJO_SERVER_DEBUG = 1;
    const ua = await app.newTestUserAgent({tap: t});
    delete process.env.MOJO_SERVER_DEBUG;

    let res;
    const output = await captureOutput(
      async () => {
        res = await ua.get('/');
      },
      {stderr: true, stdout: false}
    );
    t.equal(res.statusCode, 200);
    t.equal(await res.text(), 'Hello World!');
    t.match(output, /Server <<< Client/);
    t.match(output, /GET \//);
    t.match(output, /Host: /);
    t.match(output, /Server >>> Client/);
    t.match(output, /Content-Length: /);
    t.match(output, /Hello World!/);

    // Keep-alive connections keep working
    const keepAlive = new http.Agent({keepAlive: true});
    await captureOutput(
      async () => {
        for (let i = 0; i < 3; i++) {
          const res = await ua.get('/', {agent: keepAlive});
          t.equal(await res.text(), 'Hello World!');
        }
      },
      {stderr: true, stdout: false}
    );
    keepAlive.destroy();

    await ua.stop();
  });

  await t.test('Warmup once for multiple listen locations', async t => {
    const warmupApp = mojo({mode: 'production'});
    let warmups = 0;
    warmupApp.addAppHook('app:warmup', async () => warmups++);
    const server = new Server(warmupApp, {listen: ['http://127.0.0.1', 'http://127.0.0.1'], quiet: true});
    await server.start();
    t.equal(server.urls.length, 2);
    t.equal(warmups, 1);
    await server.stop();
  });

  await t.test('Stream errors', async t => {
    const ua = await app.newTestUserAgent({tap: t});

    const {log} = app;
    app.log = new Logger({destination: new PassThrough(), historySize: 10, level: 'error'});

    // The connection gets closed early, but the server keeps running
    await ua.get('/stream/error').catch(() => {});
    (await ua.getOk('/')).statusIs(200).bodyIs('Hello World!');
    t.match(app.log.history[0].msg, /Response stream failed: Error: Stream error/);
    app.log = log;

    await ua.stop();
  });

  await t.test('Invalid response headers', async t => {
    const ua = await app.newTestUserAgent({tap: t});
    const {log} = app;
    app.log = new Logger({destination: new PassThrough(), historySize: 10, level: 'error'});

    // The connection gets closed right away, instead of the client waiting for a response that will never come
    await t.rejects(ua.get('/bad/status'));
    (await ua.getOk('/')).statusIs(200).bodyIs('Hello World!');
    t.match(app.log.history[0].msg, /Invalid status code: invalid/);
    app.log = log;

    await ua.stop();
  });

  await t.test('Aborted stream', async t => {
    const ua = await app.newTestUserAgent({tap: t});
    const {log} = app;
    app.log = new Logger({destination: new PassThrough(), historySize: 10, level: 'error'});

    await new Promise(resolve => {
      const req = http.get(new URL('/stream/abort', ua.server.urls[0]), res => {
        res.once('data', () => req.destroy());
      });
      req.on('error', () => {}).on('close', resolve);
    });
    await new Promise(resolve => (aborted.destroyed === true ? resolve() : aborted.on('close', resolve)));
    t.equal(aborted.destroyed, true);
    t.same(app.log.history, []);
    app.log = log;

    await ua.stop();
  });
});
