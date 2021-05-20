import mojo from '../lib/mojo.js';
import t from 'tap';

t.test('Test', async t => {
  const app = mojo();

  app.any('/', ctx => ctx.render({text: 'Hello Mojo!'}));

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

  await t.test('Headers', async t => {
    const results = [];
    client.assert = (name, args, msg) => results.push([name, args, msg]);

    (await client.getOk('/')).headerExists('Content-Type').headerExistsNot('Content-Disposition')
      .headerIs('Content-Type', 'text/plain').headerLike('Content-Type', /plain/);

    t.same(results, [
      ['ok', [true], 'GET request for /'],
      ['ok', [true], 'header "Content-Type" exists'],
      ['notOk', [false], 'no "Content-Disposition" header'],
      ['equal', ['text/plain;charset=UTF-8', 'text/plain'], 'Content-Type: text/plain'],
      ['match', ['text/plain;charset=UTF-8', /plain/], 'Content-Type is similar']
    ]);
  });

  await client.stop();
});
