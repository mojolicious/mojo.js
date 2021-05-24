import mojo from '../lib/mojo.js';
import t from 'tap';

t.test('Test client', async t => {
  const app = mojo();

  app.any('/', ctx => ctx.render({text: 'Hello Mojo!'}));

  app.any('/index.html', ctx => ctx.render({text: '<p>One</p><div>Two</div>'}));

  app.websocket('/echo').to(ctx => {
    ctx.on('connection', ws => {
      ws.on('message', message => {
        ws.send(`echo: ${message}`);
      });
    });
  });

  const client = await app.newTestClient({tap: t});

  await t.test('Hello World', async t => {
    (await client.getOk('/')).statusIs(200).bodyIs('Hello Mojo!');
  });

  await t.test('Methods', async t => {
    const results = [];
    client.assert = (name, args, msg) => results.push([name, args, msg]);

    (await client.deleteOk('/'));
    (await client.getOk('/'));
    (await client.headOk('/'));
    (await client.optionsOk('/'));
    (await client.patchOk('/'));
    (await client.postOk('/'));
    (await client.putOk('/'));

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
    client.assert = (name, args, msg) => results.push([name, args, msg]);

    (await client.getOk('/')).statusIs(200);

    t.same(results, [
      ['ok', [true], 'GET request for /'],
      ['equal', [200, 200], 'response status is 200']
    ]);
  });

  await t.test('Headers', async t => {
    const results = [];
    client.assert = (name, args, msg) => results.push([name, args, msg]);

    (await client.getOk('/')).typeIs('text/plain').typeLike(/plain/).headerExists('Content-Type')
      .headerExistsNot('Content-Disposition').headerIs('Content-Type', 'text/plain')
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
    client.assert = (name, args, msg) => results.push([name, args, msg]);

    (await client.getOk('/')).bodyIs('test').bodyLike(/that/).bodyUnlike(/whatever/);

    t.same(results, [
      ['ok', [true], 'GET request for /'],
      ['equal', ['Hello Mojo!', 'test'], 'body is equal'],
      ['match', ['Hello Mojo!', /that/], 'body is similar'],
      ['notMatch', ['Hello Mojo!', /whatever/], 'body is not similar']
    ]);
  });

  await t.test('HTML', async t => {
    const results = [];
    client.assert = (name, args, msg) => results.push([name, args, msg]);

    (await client.getOk('/index.html')).elementExists('p').elementExists('h1').elementExistsNot('h1')
      .elementExistsNot('div');

    t.same(results, [
      ['ok', [true], 'GET request for /index.html'],
      ['ok', [true], 'element for selector "p" exists'],
      ['ok', [false], 'element for selector "h1" exists'],
      ['ok', [true], 'no element for selector "h1"'],
      ['ok', [false], 'no element for selector "div"']
    ]);
  });

  await t.test('WebSocket', async t => {
    const results = [];
    client.assert = (name, args, msg) => results.push([name, args, msg]);

    await client.websocketOk('/echo');
    await client.sendOk('hello');
    await client.messageOk();
    await client.finishOk(1000);
    await client.finishedOk(1000);

    t.same(results, [
      ['ok', [true], 'WebSocket handshake with /echo'],
      ['ok', [true], 'send message'],
      ['ok', [true], 'message received'],
      ['ok', [true], 'closed WebSocket'],
      ['equal', [1000, 1000], 'WebSocket closed with status 1000']
    ]);
  });

  await client.stop();
});
