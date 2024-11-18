import mojo from '../lib/core.js';
import t from 'tap';

t.test('TestUserAgent', async t => {
  const app = mojo();

  if (app.mode === 'development') app.log.level = 'debug';

  app.any('/', ctx => ctx.render({text: 'Hello Mojo!'}));

  app.any('/first.html', ctx => ctx.render({text: '<p>One</p><div>Two</div>'}));

  app.any('/second.html', ctx => ctx.render({text: '<b>Three</b><i>Four</i>'}));

  app.any('/index.json', ctx => ctx.render({json: {a: ['b', 'c']}}));

  app.any('/index.yaml', ctx => ctx.render({yaml: {a: ['b', 'c']}}));

  app.websocket('/echo').to(ctx => {
    ctx.on('connection', ws => {
      ws.on('message', message => {
        ws.send(`echo: ${message}`);
      });
    });
  });

  app.post('/redirect', ctx => ctx.redirectTo('/target', {query: {test: 'pass'}}));

  app.get('/target', ctx => ctx.render({text: 'Hi'}));

  for (const useTap of [false, true]) {
    const ua = useTap ? await app.newTestUserAgent({tap: t}) : await app.newTestUserAgent();

    await t.test('Status Assertion test', async () => {
      (await ua.getOk('/')).statusIs(200);
    });

    await t.test('Header Assertion tests', async () => {
      (await ua.getOk('/'))
        .typeIs('text/plain; charset=utf-8')
        .typeLike(/plain/)
        .headerIs('Content-Type', 'text/plain; charset=utf-8')
        .headerLike('Content-Type', /plain/)
        .headerExists('Content-Type')
        .headerExistsNot('X-Test');
    });

    await t.test('Body Assertion tests', async () => {
      (await ua.getOk('/')).bodyIs('Hello Mojo!').bodyLike(/Hello/).bodyUnlike(/Bye/);
    });

    await t.test('JSON Assertion tests', async () => {
      (await ua.getOk('/index.json')).jsonIs({a: ['b', 'c']}).jsonIs(['b', 'c'], '/a');
    });

    await t.test('YAML Assertion tests', async () => {
      (await ua.getOk('/index.yaml')).yamlIs({a: ['b', 'c']}).yamlIs(['b', 'c'], '/a');
    });

    await t.test('HTML Assertion tests', async () => {
      (await ua.getOk('/first.html'))
        .elementExists('p')
        .elementExistsNot('body #error')
        .textLike('p', /One/)
        .textUnlike('p', /Zero/);
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
        ['strictEqual', [200, 200], 'response status is 200']
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
        .headerIsnt('Content-Type', 'text/plain')
        .headerLike('Content-Type', /plain/);

      t.same(results, [
        ['ok', [true], 'GET request for /'],
        ['strictEqual', ['text/plain; charset=utf-8', 'text/plain'], 'Content-Type: text/plain'],
        ['match', ['text/plain; charset=utf-8', /plain/], 'Content-Type is similar'],
        ['ok', [true], 'header "Content-Type" exists'],
        ['ok', [true], 'no "Content-Disposition" header'],
        ['strictEqual', ['text/plain; charset=utf-8', 'text/plain'], 'Content-Type: text/plain'],
        ['notStrictEqual', ['text/plain; charset=utf-8', 'text/plain'], 'not Content-Type: text/plain'],
        ['match', ['text/plain; charset=utf-8', /plain/], 'Content-Type is similar']
      ]);
    });

    await t.test('Body', async t => {
      const results = [];
      ua.assert = (name, args, msg) => results.push([name, args, msg]);

      (await ua.getOk('/'))
        .bodyIs('test')
        .bodyIsnt('test')
        .bodyLike(/that/)
        .bodyUnlike(/whatever/);

      t.same(results, [
        ['ok', [true], 'GET request for /'],
        ['strictEqual', ['Hello Mojo!', 'test'], 'body is equal'],
        ['notStrictEqual', ['Hello Mojo!', 'test'], 'body is not equal'],
        ['match', ['Hello Mojo!', /that/], 'body is similar'],
        ['doesNotMatch', ['Hello Mojo!', /whatever/], 'body is not similar']
      ]);
    });

    await t.test('HTML', async t => {
      let results = [];
      ua.assert = (name, args, msg) => results.push([name, args, msg]);

      (await ua.getOk('/first.html'))
        .elementExists('p')
        .elementExists('h1')
        .elementExistsNot('h1')
        .elementExistsNot('div')
        .textLike('div', /test/)
        .textLike('nothing', /123/)
        .textUnlike('div', /test/)
        .textUnlike('nothing', /123/);

      t.same(results, [
        ['ok', [true], 'GET request for /first.html'],
        ['ok', [true], 'element for selector "p" exists'],
        ['ok', [false], 'element for selector "h1" exists'],
        ['ok', [true], 'no element for selector "h1"'],
        ['ok', [false], 'no element for selector "div"'],
        ['match', ['Two', /test/], 'similar match for selector "div"'],
        ['match', ['', /123/], 'similar match for selector "nothing"'],
        ['doesNotMatch', ['Two', /test/], 'no similar match for selector "div"'],
        ['doesNotMatch', ['', /123/], 'no similar match for selector "nothing"']
      ]);

      results = [];
      (await ua.getOk('/second.html')).elementExists('b').elementExistsNot('div');

      t.same(results, [
        ['ok', [true], 'GET request for /second.html'],
        ['ok', [true], 'element for selector "b" exists'],
        ['ok', [true], 'no element for selector "div"']
      ]);
    });

    await t.test('JSON', async t => {
      const results = [];
      ua.assert = (name, args, msg) => results.push([name, args, msg]);

      (await ua.getOk('/index.json'))
        .jsonHas('/a')
        .jsonHas('/d')
        .jsonIs(['b', 'c'], '/a')
        .jsonIs('e', '/d')
        .jsonIs({a: ['b', 'c']});

      t.same(results, [
        ['ok', [true], 'GET request for /index.json'],
        ['ok', [true], 'has value for JSON Pointer "/a" (JSON)'],
        ['ok', [false], 'has value for JSON Pointer "/d" (JSON)'],
        [
          'deepStrictEqual',
          [
            ['b', 'c'],
            ['b', 'c']
          ],
          'exact match for JSON Pointer "/a" (JSON)'
        ],
        ['deepStrictEqual', [undefined, 'e'], 'exact match for JSON Pointer "/d" (JSON)'],
        ['deepStrictEqual', [{a: ['b', 'c']}, {a: ['b', 'c']}], 'exact match for JSON Pointer "" (JSON)']
      ]);
    });

    await t.test('YAML', async t => {
      const results = [];
      ua.assert = (name, args, msg) => results.push([name, args, msg]);

      (await ua.getOk('/index.yaml'))
        .yamlHas('/a')
        .yamlHas('/d')
        .yamlIs(['b', 'c'], '/a')
        .yamlIs('e', '/d')
        .yamlIs({a: ['b', 'c']});

      t.same(results, [
        ['ok', [true], 'GET request for /index.yaml'],
        ['ok', [true], 'has value for JSON Pointer "/a" (YAML)'],
        ['ok', [false], 'has value for JSON Pointer "/d" (YAML)'],
        [
          'deepStrictEqual',
          [
            ['b', 'c'],
            ['b', 'c']
          ],
          'exact match for JSON Pointer "/a" (YAML)'
        ],
        ['deepStrictEqual', [undefined, 'e'], 'exact match for JSON Pointer "/d" (YAML)'],
        ['deepStrictEqual', [{a: ['b', 'c']}, {a: ['b', 'c']}], 'exact match for JSON Pointer "" (YAML)']
      ]);
    });

    await t.test('WebSocket exception', async t => {
      let result;
      try {
        await ua.messageOk();
      } catch (error) {
        result = error;
      }
      t.match(result, /No active WebSocket connection/);
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
        ['strictEqual', [1000, 1000], 'WebSocket closed with status 1000']
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

    await t.test('Test redirects', async t => {
      (await ua.postOk('/redirect')).statusIs(302).headerLike('location', /\?test=pass/);

      const uaRedirect = await app.newTestUserAgent({tap: t, maxRedirects: 1});
      (await uaRedirect.postOk('/redirect')).statusIs(200).bodyIs('Hi');
      await uaRedirect.stop();
    });
    await ua.stop();
  }
});
