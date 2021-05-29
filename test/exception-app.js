import File from '../lib/file.js';
import mojo from '../lib/mojo.js';
import t from 'tap';

t.test('Exception app', async t => {
  t.test('Development', async t => {
    const app = mojo();

    app.get('/', ctx => ctx.render({text: 'Hello World!'}));

    app.any('/exception', ctx => {
      throw new Error('Test exception');
    });

    const client = await app.newTestClient({tap: t});

    await t.test('Mode', async t => {
      t.equal(app.mode, 'development');
      t.equal(app.log.level, 'debug');
      (await client.getOk('/')).statusIs(200).bodyIs('Hello World!');
    });

    await t.test('Not found', async t => {
      app.exceptionFormat = 'html';
      (await client.getOk('/does_not_exist')).statusIs(404).typeIs('text/html; charset=utf-8')
        .bodyLike(/This application is in.*development.*mode/).bodyUnlike(/no-raptor\.png/);

      app.exceptionFormat = 'txt';
      (await client.getOk('/does_not_exist')).statusIs(404).typeIs('text/plain; charset=utf-8').bodyIs('Not Found');

      app.exceptionFormat = 'json';
      (await client.getOk('/does_not_exist')).statusIs(404).typeIs('application/json; charset=utf-8')
        .jsonIs({error: {message: 'Not Found'}});
      app.exceptionFormat = 'txt';
    });

    await t.test('Exception', async t => {
      const dir = await File.tempDir();
      const file = dir.child('development.log');
      app.log.destination = file.createWriteStream();

      app.exceptionFormat = 'html';
      (await client.getOk('/exception')).statusIs(500).typeIs('text/html; charset=utf-8')
        .bodyLike(/This application is in.*development.*mode/).bodyUnlike(/\/public\/mojo\/failraptor\.png/);

      app.exceptionFormat = 'txt';
      (await client.getOk('/exception')).statusIs(500).typeIs('text/plain; charset=utf-8')
        .bodyLike(/Test exception/);

      app.exceptionFormat = 'json';
      (await client.getOk('/exception')).statusIs(500).typeIs('application/json; charset=utf-8')
        .bodyLike(/Test exception/);
      app.exceptionFormat = 'txt';

      t.equal(app.log.history[0].level, 'error');
      t.match(app.log.history[0].msg, /Error: Test exception/);
      t.equal(app.log.history[1].level, 'error');
      t.match(app.log.history[1].msg, /Error: Test exception/);
      t.equal(app.log.history[2].level, 'error');
      t.match(app.log.history[2].msg, /Error: Test exception/);
      t.same(app.log.history[3], undefined);
      t.match(await file.readFile(), /Error: Test exception/);
    });

    await client.stop();
  });

  t.test('Development (custom views)', async t => {
    const app = mojo();
    app.renderer.viewPaths.push(File.currentFile().sibling('support', 'exception-app', 'views').toString());

    app.any('/exception', ctx => {
      throw new Error('Another test exception');
    });

    const client = await app.newTestClient({tap: t});

    await t.test('Not found', async t => {
      app.exceptionFormat = 'html';
      (await client.getOk('/does_not_exist')).statusIs(404).typeIs('text/html; charset=utf-8')
        .bodyLike(/Custom not found/);

      app.exceptionFormat = 'txt';
      (await client.getOk('/does_not_exist')).statusIs(404).typeIs('text/plain; charset=utf-8')
        .bodyIs('Not Found');
    });

    await t.test('Exception', async t => {
      const dir = await File.tempDir();
      const file = dir.child('development.log');
      app.log.destination = file.createWriteStream();

      app.exceptionFormat = 'html';
      (await client.getOk('/exception')).statusIs(500).typeIs('text/html; charset=utf-8')
        .bodyLike(/Custom exception: Error: Another test exception/);

      app.exceptionFormat = 'txt';
      (await client.getOk('/exception')).statusIs(500).typeIs('text/plain; charset=utf-8')
        .bodyLike(/Error: Another test exception/);

      t.equal(app.log.history[0].level, 'error');
      t.match(app.log.history[0].msg, /Error: Another test exception/);
      t.equal(app.log.history[1].level, 'error');
      t.match(app.log.history[1].msg, /Error: Another test exception/);
      t.same(app.log.history[2], undefined);
      t.match(await file.readFile(), /Error: Another test exception/);
    });

    await client.stop();
  });

  t.test('Production', async t => {
    process.env.NODE_ENV = 'production';
    const app = mojo();

    app.get('/', ctx => ctx.render({text: 'Hello World!'}));

    app.any('/exception', ctx => {
      throw new Error('Test exception');
    });

    const client = await app.newTestClient({tap: t});

    await t.test('Mode', async t => {
      t.equal(app.mode, 'production');
      t.equal(app.log.level, 'info');
      (await client.getOk('/')).statusIs(200).bodyIs('Hello World!');
    });

    await t.test('Not found', async t => {
      app.exceptionFormat = 'html';
      (await client.getOk('/does_not_exist')).statusIs(404).bodyUnlike(/This application is in.*development.*mode/)
        .bodyLike(/no-raptor\.png/);

      app.exceptionFormat = 'txt';
      (await client.getOk('/does_not_exist')).statusIs(404).typeIs('text/plain; charset=utf-8').bodyIs('Not Found');

      app.exceptionFormat = 'json';
      (await client.getOk('/does_not_exist')).statusIs(404).typeIs('application/json; charset=utf-8')
        .jsonIs({error: {message: 'Not Found'}});
      app.exceptionFormat = 'txt';
    });

    await t.test('Exception', async t => {
      const dir = await File.tempDir();
      const file = dir.child('production.log');
      app.log.destination = file.createWriteStream();

      app.exceptionFormat = 'html';
      (await client.getOk('/exception')).statusIs(500).typeIs('text/html; charset=utf-8')
        .bodyUnlike(/This application is in.*development.*mode/).bodyLike(/failraptor\.png/);

      app.exceptionFormat = 'txt';
      (await client.getOk('/exception')).statusIs(500).typeIs('text/plain; charset=utf-8')
        .bodyIs('Internal Server Error');

      app.exceptionFormat = 'json';
      (await client.getOk('/exception')).statusIs(500).typeIs('application/json; charset=utf-8')
        .jsonIs({error: {message: 'Internal Server Error'}});
      app.exceptionFormat = 'txt';

      t.same(app.log.history, []);
      t.match(await file.readFile(), /Error: Test exception/);
    });

    await client.stop();
  });

  t.test('Production (custom views)', async t => {
    process.env.NODE_ENV = 'production';
    const app = mojo();
    app.renderer.viewPaths.push(File.currentFile().sibling('support', 'exception-app', 'views').toString());

    app.any('/exception', ctx => {
      throw new Error('Another test exception');
    });

    const client = await app.newTestClient({tap: t});

    await t.test('Not found', async t => {
      app.exceptionFormat = 'html';
      (await client.getOk('/does_not_exist')).statusIs(404).typeIs('text/html; charset=utf-8')
        .bodyLike(/Production not found/);

      app.exceptionFormat = 'txt';
      (await client.getOk('/does_not_exist')).statusIs(404).typeIs('text/plain; charset=utf-8').bodyIs('Not Found');
    });

    await t.test('Exception', async t => {
      const dir = await File.tempDir();
      const file = dir.child('production.log');
      app.log.destination = file.createWriteStream();

      app.exceptionFormat = 'html';
      (await client.getOk('/exception')).statusIs(500).typeIs('text/html; charset=utf-8')
        .bodyLike(/Production exception/);

      app.exceptionFormat = 'txt';
      (await client.getOk('/exception')).statusIs(500).typeIs('text/plain; charset=utf-8')
        .bodyIs('Internal Server Error');

      t.same(app.log.history, []);
      t.match(await file.readFile(), /Error: Another test exception/);
    });

    await client.stop();
  });

  t.test('WebSocket', async t => {
    const app = mojo();

    app.websocket('/ws/exception/before/sync').to(ctx => {
      throw new Error('Sync WebSocket test exception before');
    });

    app.websocket('/ws/exception/before/async').to(async ctx => {
      throw new Error('Async WebSocket test exception before');
    });

    app.websocket('/ws/exception/after/async').to(ctx => {
      ctx.plain(async ws => {
        throw new Error('Async WebSocket test exception after');
      });
    });

    app.websocket('/ws/exception/after/sync').to(ctx => {
      ctx.on('connection', ws => {
        throw new Error('Sync WebSocket test exception after');
      });
    });

    app.websocket('/ws/exception/iterator').to(ctx => {
      ctx.plain(async ws => {
        // eslint-disable-next-line no-unreachable-loop, no-unused-vars
        for await (const message of ws) {
          throw new Error('WebSocket iterator test exception');
        }
      });
    });

    app.websocket('/ws/exception/event').to(ctx => {
      ctx.on('connection', ws => {
        ws.on('message', message => {
          throw new Error('WebSocket event test exception');
        });
      });
    });

    const client = await app.newTestClient({tap: t});

    await t.test('WebSocket exception (during handshake and sync)', async t => {
      const dir = await File.tempDir();
      const file = dir.child('websocket1a.log');
      app.log.destination = file.createWriteStream();

      let result;
      try {
        await client.websocket('/ws/exception/before/sync');
      } catch (error) {
        result = error;
      }

      t.match(result, {code: 'ECONNRESET'});
      t.match(await file.readFile(), /Error: Sync WebSocket test exception before/);
    });

    await t.test('WebSocket exception (during handshake and async)', async t => {
      const dir = await File.tempDir();
      const file = dir.child('websocket1b.log');
      app.log.destination = file.createWriteStream();

      let result;
      try {
        await client.websocket('/ws/exception/before/async');
      } catch (error) {
        result = error;
      }

      t.match(result, {code: 'ECONNRESET'});
      t.match(await file.readFile(), /Error: Async WebSocket test exception before/);
    });

    await t.test('WebSocket exception (after handshake and async)', async t => {
      const dir = await File.tempDir();
      const file = dir.child('websocket2a.log');
      app.log.destination = file.createWriteStream();

      const ws = await client.websocket('/ws/exception/after/async');
      const code = await new Promise(resolve => ws.on('close', resolve));

      t.equal(code, 1011);
      t.match(await file.readFile(), /Error: Async WebSocket test exception after/);
    });

    await t.test('WebSocket exception (after handshake and sync)', async t => {
      const dir = await File.tempDir();
      const file = dir.child('websocket2b.log');
      app.log.destination = file.createWriteStream();

      const ws = await client.websocket('/ws/exception/after/sync');
      const code = await new Promise(resolve => ws.on('close', resolve));

      t.equal(code, 1011);
      t.match(await file.readFile(), /Error: Sync WebSocket test exception after/);
    });

    await t.test('WebSocket exception (iterator)', async t => {
      const dir = await File.tempDir();
      const file = dir.child('websocket3a.log');
      app.log.destination = file.createWriteStream();

      const ws = await client.websocket('/ws/exception/iterator');
      await ws.send('test');
      const code = await new Promise(resolve => ws.on('close', resolve));

      t.equal(code, 1011);
      t.match(await file.readFile(), /Error: WebSocket iterator test exception/);
    });

    await t.test('WebSocket exception (events)', async t => {
      const dir = await File.tempDir();
      const file = dir.child('websocket3b.log');
      app.log.destination = file.createWriteStream();

      const ws = await client.websocket('/ws/exception/event');
      await ws.send('test');
      const code = await new Promise(resolve => ws.on('close', resolve));

      t.equal(code, 1011);
      t.match(await file.readFile(), /Error: WebSocket event test exception/);
    });

    await client.stop();
  });
});
