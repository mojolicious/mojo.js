import mojo, {Server, UserAgent} from '../lib/core.js';
import Path from '@mojojs/path';
import t from 'tap';

const os = process.platform;
const skip = os === 'linux' || os === 'darwin' ? {} : {skip: 'UNIX domain socket support required'};

t.test('UNIX domain sockets', skip, async t => {
  const app = mojo();

  if (app.mode === 'development') app.log.level = 'debug';

  app.get('/hello', ctx => ctx.render({text: 'Hello World!'}));

  app.get('/url', async ctx => {
    const params = await ctx.params();
    const absolute = params.get('absolute') === '1';
    await ctx.render({text: ctx.urlFor('/index.html', {absolute})});
  });

  app.get('/ip', ctx => ctx.render({text: ctx.req.ip ?? 'no ip'}));

  app.websocket('/echo').to(ctx => {
    ctx.plain(async ws => {
      for await (const message of ws) {
        ws.send(message);
      }
    });
  });

  const dir = await Path.tempDir();
  const sock = dir.child('test.sock').toString();

  const server = new Server(app, {listen: [`http+unix://${sock}`], quiet: true});
  await server.start();
  const ua = new UserAgent({baseURL: 'http://localhost:4000', name: 'mojo 1.0'});

  await t.test('Hello World', async t => {
    const res = await ua.get('/hello', {socketPath: sock});
    t.equal(res.httpVersion, '1.1');
    t.equal(res.statusCode, 200);
    t.equal(res.statusMessage, 'OK');
    t.equal(await res.text(), 'Hello World!');
  });

  await t.test('URLs', async t => {
    const res = await ua.get('/url', {socketPath: sock});
    t.equal(res.httpVersion, '1.1');
    t.equal(res.statusCode, 200);
    t.equal(res.statusMessage, 'OK');
    t.equal(await res.text(), '/index.html');

    const res2 = await ua.get('/url?absolute=1', {socketPath: sock});
    t.equal(res2.httpVersion, '1.1');
    t.equal(res2.statusCode, 200);
    t.equal(res2.statusMessage, 'OK');
    t.equal(await res2.text(), 'http://localhost:4000/index.html');
  });

  await t.test('IP', async t => {
    const res = await ua.get('/ip', {socketPath: sock});
    t.equal(res.httpVersion, '1.1');
    t.equal(res.statusCode, 200);
    t.equal(res.statusMessage, 'OK');
    t.equal(await res.text(), 'no ip');
  });

  await t.test('WebSocket', async t => {
    const ws = await ua.websocket('/echo', {socketPath: sock});
    ws.send('Hello Mojo!');
    let result;
    for await (const message of ws) {
      result = message;
      ws.close();
    }
    t.equal(result, 'Hello Mojo!');
  });

  const path = new Path(sock);
  t.same(await path.exists(), true);
  await server.stop();
  t.same(await path.exists(), false);
});
