import mojo from '../lib/core.js';
import t from 'tap';

t.test('TestUserAgent', async t => {
  const app = mojo();

  if (app.mode === 'development') app.log.level = 'debug';

  app.any('/', ctx => ctx.render({text: 'Hello Mojo!'}));

  app.any('/index.html', ctx => ctx.render({text: '<p>One</p><div>Two</div>'}));

  app.any('/index.json', ctx => ctx.render({json: {a: ['b', 'c']}}));

  app.any('/index.yaml', ctx => ctx.render({yaml: {a: ['b', 'c']}}));

  app.websocket('/echo').to(ctx => {
    ctx.on('connection', ws => {
      ws.on('message', message => {
        ws.send(`echo: ${message}`);
      });
    });
  });

  const ua = await app.newTestUserAgent({tap: t});

  await t.test('Hello World', async () => {
    (await ua.getOk('/')).statusIs(200).bodyIs('Hello Mojo!');
  });

  await t.test('Methods', async t => {
    const results = [];
    ua.assert = (name, args, msg) => results.push([name, args, msg]);

    await ua.deleteOk('/');
    await ua.getOk('/');
    await ua.headOk('/');
    await ua.optionsOk('/');
    await ua.patchOk('/');
    await ua.postOk('/');
    await ua.putOk('/');

    t.same(results, [
      ['ok', [true], 'DELETE request for /'],
      ['ok', [true], 'GET request for /'],
      ['ok', [true], 'HEAD request for /'],
      ['ok', [true], 'OPTIONS request for /'],
      ['ok', [true], 'PATCH request for /'],
      ['ok', [true], 'POST request for /'],
      ['ok', [true], 'PUT request for /']
    ]);
  });

  await t.test('Status', async t => {
    const results = [];
    ua.assert = (name, args, msg) => results.push([name, args, msg]);

    (await ua.getOk('/')).statusIs(200);

    t.same(results, [
      ['ok', [true], 'GET request for /'],
      ['equal', [200, 200], 'response status is 200']
    ]);
  });

  await t.test('Headers', async t => {
    const results = [];
    ua.assert = (name, args, msg) => results.push([name, args, msg]);

    (await ua.getOk('/'))
      .typeIs('text/plain')
      .typeLike(/plain/)
      .headerExists('Content-Type')
      .headerExistsNot('Content-Disposition')
      .headerIs('Content-Type', 'text/plain')
      .headerLike('Content-Type', /plain/);

    t.same(results, [
      ['ok', [true], 'GET request for /'],
      ['equal', ['text/plain; charset=utf-8', 'text/plain'], 'Content-Type: text/plain'],
      ['match', ['text/plain; charset=utf-8', /plain/], 'Content-Type is similar'],
      ['ok', [true], 'header "Content-Type" exists'],
      ['notOk', [false], 'no "Content-Disposition" header'],
      ['equal', ['text/plain; charset=utf-8', 'text/plain'], 'Content-Type: text/plain'],
      ['match', ['text/plain; charset=utf-8', /plain/], 'Content-Type is similar']
    ]);
  });

  await t.test('Body', async t => {
    const results = [];
    ua.assert = (name, args, msg) => results.push([name, args, msg]);

    (await ua.getOk('/'))
      .bodyIs('test')
      .bodyLike(/that/)
      .bodyUnlike(/whatever/);

    t.same(results, [
      ['ok', [true], 'GET request for /'],
      ['equal', ['Hello Mojo!', 'test'], 'body is equal'],
      ['match', ['Hello Mojo!', /that/], 'body is similar'],
      ['notMatch', ['Hello Mojo!', /whatever/], 'body is not similar']
    ]);
  });

  await t.test('HTML', async t => {
    const results = [];
    ua.assert = (name, args, msg) => results.push([name, args, msg]);

    (await ua.getOk('/index.html'))
      .elementExists('p')
      .elementExists('h1')
      .elementExistsNot('h1')
      .elementExistsNot('div');

    t.same(results, [
      ['ok', [true], 'GET request for /index.html'],
      ['ok', [true], 'element for selector "p" exists'],
      ['ok', [false], 'element for selector "h1" exists'],
      ['ok', [true], 'no element for selector "h1"'],
      ['ok', [false], 'no element for selector "div"']
    ]);
  });

  await t.test('JSON', async t => {
    const results = [];
    ua.assert = (name, args, msg) => results.push([name, args, msg]);

    (await ua.getOk('/index.json'))
      .jsonIs(['b', 'c'], '/a')
      .jsonIs('e', '/d')
      .jsonIs({a: ['b', 'c']});

    t.same(results, [
      ['ok', [true], 'GET request for /index.json'],
      [
        'same',
        [
          ['b', 'c'],
          ['b', 'c']
        ],
        'exact match for JSON Pointer "/a" (JSON)'
      ],
      ['same', [undefined, 'e'], 'exact match for JSON Pointer "/d" (JSON)'],
      ['same', [{a: ['b', 'c']}, {a: ['b', 'c']}], 'exact match for JSON Pointer "" (JSON)']
    ]);
  });

  await t.test('YAML', async t => {
    const results = [];
    ua.assert = (name, args, msg) => results.push([name, args, msg]);

    (await ua.getOk('/index.yaml'))
      .yamlIs(['b', 'c'], '/a')
      .yamlIs('e', '/d')
      .yamlIs({a: ['b', 'c']});

    t.same(results, [
      ['ok', [true], 'GET request for /index.yaml'],
      [
        'same',
        [
          ['b', 'c'],
          ['b', 'c']
        ],
        'exact match for JSON Pointer "/a" (YAML)'
      ],
      ['same', [undefined, 'e'], 'exact match for JSON Pointer "/d" (YAML)'],
      ['same', [{a: ['b', 'c']}, {a: ['b', 'c']}], 'exact match for JSON Pointer "" (YAML)']
    ]);
  });

  await t.test('WebSocket', async t => {
    const results = [];
    ua.assert = (name, args, msg) => results.push([name, args, msg]);

    await ua.websocketOk('/echo');
    await ua.sendOk('hello');
    await ua.messageOk();
    await ua.closeOk(1000);
    await ua.closedOk(1000);

    t.same(results, [
      ['ok', [true], 'WebSocket handshake with /echo'],
      ['ok', [true], 'send message'],
      ['ok', [true], 'message received'],
      ['ok', [true], 'closed WebSocket'],
      ['equal', [1000, 1000], 'WebSocket closed with status 1000']
    ]);
  });

  await t.test('Test without active connection', async t => {
    const badAgent = await app.newTestUserAgent();

    t.throws(
      () => {
        badAgent.statusIs(200);
      },
      {message: /No active HTTP response/}
    );

    let result;
    try {
      await badAgent.sendOk('fail');
    } catch (error) {
      result = error;
    }
    t.match(result, {message: /No active WebSocket connection/});

    await badAgent.stop();
  });

  await ua.stop();
});
