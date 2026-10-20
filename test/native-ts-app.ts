import http from 'node:http';
import mojo, {UserAgent} from '../src/core.ts';
import t from 'tap';

t.test('App', async t => {
  const app = mojo();

  app.log.level = 'fatal';

  // GET /
  app.get('/', ctx => ctx.render({text: 'Hello Mojo!'}));

  // Not "await using", because Node.js 22 does not support it yet, but that is what it calls
  const ua = await app.newTestUserAgent({tap: t});

  await t.test('Hello World', async () => {
    (await ua.getOk('/')).statusIs(200).headerIs('Content-Length', '11').bodyIs('Hello Mojo!');
  });

  await t.test('Hello World (user-agent cleanup)', async () => {
    const keepAlive = new http.Agent({keepAlive: true});
    const ua2 = new UserAgent({baseURL: ua.server?.urls[0]});

    const res = await ua2.get('/', {agent: keepAlive});
    t.equal(res.statusCode, 200);
    t.equal(res.get('Connection'), 'keep-alive');
    t.equal(await res.text(), 'Hello Mojo!');
    await ua2[Symbol.asyncDispose]();
  });

  await ua[Symbol.asyncDispose]();
});
