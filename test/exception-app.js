import mojo from '../lib/core.js';
import Path from '@mojojs/path';
import t from 'tap';

t.test('Exception app', async t => {
  await t.test('Development', async t => {
    const app = mojo();

    app.log.level = 'debug';

    app.get('/', ctx => ctx.render({text: 'Hello World!'}));

    app.any('/exception', () => {
      throw new Error('Test exception');
    });

    app.any('/async/exception', async () => {
      function myAsyncFunction() {
        return new Promise(() => {
          console.warn('throw');
          throw `Uh-oh!`;
        });
      }

      await myAsyncFunction();
    });

    const ua = await app.newTestUserAgent({tap: t});

    await t.test('Mode', async t => {
      t.equal(app.mode, 'development');
      t.equal(app.log.level, 'debug');
      (await ua.getOk('/')).statusIs(200).bodyIs('Hello World!');
    });

    await t.test('Not found', async () => {
      app.exceptionFormat = 'html';
      (await ua.getOk('/does_not_exist'))
        .statusIs(404)
        .typeIs('text/html; charset=utf-8')
        .bodyLike(/This application is in.*development.*mode/)
        .bodyUnlike(/no-raptor\.png/);

      app.exceptionFormat = 'txt';
      (await ua.getOk('/does_not_exist')).statusIs(404).typeIs('text/plain; charset=utf-8').bodyIs('Not Found');

      app.exceptionFormat = 'json';
      (await ua.getOk('/does_not_exist'))
        .statusIs(404)
        .typeIs('application/json; charset=utf-8')
        .jsonIs({error: {message: 'Not Found'}});
      app.exceptionFormat = 'txt';
    });

    await t.test('Exception', async t => {
      const dir = await Path.tempDir();
      const file = dir.child('development.log');
      app.log.destination = file.createWriteStream();

      app.exceptionFormat = 'html';
      (await ua.getOk('/exception'))
        .statusIs(500)
        .typeIs('text/html; charset=utf-8')
        .bodyLike(/This application is in.*development.*mode/)
        .bodyUnlike(/\/static\/mojo\/failraptor\.png/);

      app.exceptionFormat = 'txt';
      (await ua.getOk('/exception'))
        .statusIs(500)
        .typeIs('text/plain; charset=utf-8')
        .bodyLike(/Test exception/);

      app.exceptionFormat = 'json';
      (await ua.getOk('/exception'))
        .statusIs(500)
        .typeIs('application/json; charset=utf-8')
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

    await ua.stop();
  });

  await t.test('Development (custom views)', async t => {
    const app = mojo();

    app.log.level = 'debug';
    app.renderer.viewPaths.push(Path.currentFile().sibling('support', 'js', 'exception-app', 'views').toString());

    app.any('/exception', () => {
      throw new Error('Another test exception');
    });

    const ua = await app.newTestUserAgent({tap: t});

    await t.test('Not found', async () => {
      app.exceptionFormat = 'html';
      (await ua.getOk('/does_not_exist'))
        .statusIs(404)
        .typeIs('text/html; charset=utf-8')
        .bodyLike(/Custom not found/);

      app.exceptionFormat = 'txt';
      (await ua.getOk('/does_not_exist')).statusIs(404).typeIs('text/plain; charset=utf-8').bodyIs('Not Found');
    });

    await t.test('Exception', async t => {
      const dir = await Path.tempDir();
      const file = dir.child('development.log');
      app.log.destination = file.createWriteStream();

      app.exceptionFormat = 'html';
      (await ua.getOk('/exception'))
        .statusIs(500)
        .typeIs('text/html; charset=utf-8')
        .bodyLike(/Custom exception: Error: Another test exception/);

      app.exceptionFormat = 'txt';
      (await ua.getOk('/exception'))
        .statusIs(500)
        .typeIs('text/plain; charset=utf-8')
        .bodyLike(/Error: Another test exception/);

      t.equal(app.log.history[0].level, 'error');
      t.match(app.log.history[0].msg, /Error: Another test exception/);
      t.equal(app.log.history[1].level, 'error');
      t.match(app.log.history[1].msg, /Error: Another test exception/);
      t.same(app.log.history[2], undefined);
      t.match(await file.readFile(), /Error: Another test exception/);
    });

    await ua.stop();
  });

  await t.test('Production', async t => {
    process.env.NODE_ENV = 'production';
    const app = mojo();

    app.get('/', ctx => ctx.render({text: 'Hello World!'}));

    app.any('/exception', () => {
      throw new Error('Test exception');
    });

    const ua = await app.newTestUserAgent({tap: t});

    await t.test('Mode', async t => {
      t.equal(app.mode, 'production');
      t.equal(app.log.level, 'info');
      (await ua.getOk('/')).statusIs(200).bodyIs('Hello World!');
    });

    await t.test('Not found', async () => {
      app.exceptionFormat = 'html';
      (await ua.getOk('/does_not_exist'))
        .statusIs(404)
        .bodyUnlike(/This application is in.*development.*mode/)
        .bodyLike(/no-raptor\.png/);

      app.exceptionFormat = 'txt';
      (await ua.getOk('/does_not_exist')).statusIs(404).typeIs('text/plain; charset=utf-8').bodyIs('Not Found');

      app.exceptionFormat = 'json';
      (await ua.getOk('/does_not_exist'))
        .statusIs(404)
        .typeIs('application/json; charset=utf-8')
        .jsonIs({error: {message: 'Not Found'}});
      app.exceptionFormat = 'txt';
    });

    await t.test('Exception', async t => {
      const dir = await Path.tempDir();
      const file = dir.child('production.log');
      app.log.destination = file.createWriteStream();

      app.exceptionFormat = 'html';
      (await ua.getOk('/exception'))
        .statusIs(500)
        .typeIs('text/html; charset=utf-8')
        .bodyUnlike(/This application is in.*development.*mode/)
        .bodyLike(/failraptor\.png/);

      app.exceptionFormat = 'txt';
      (await ua.getOk('/exception')).statusIs(500).typeIs('text/plain; charset=utf-8').bodyIs('Internal Server Error');

      app.exceptionFormat = 'json';
      (await ua.getOk('/exception'))
        .statusIs(500)
        .typeIs('application/json; charset=utf-8')
        .jsonIs({error: {message: 'Internal Server Error'}});
      app.exceptionFormat = 'txt';

      t.same(app.log.history, []);
      t.match(await file.readFile(), /Error: Test exception/);
    });

    await ua.stop();
  });

  await t.test('Production (custom views)', async t => {
    process.env.NODE_ENV = 'production';
    const app = mojo();
    app.renderer.viewPaths.push(Path.currentFile().sibling('support', 'js', 'exception-app', 'views').toString());

    app.any('/exception', () => {
      throw new Error('Another test exception');
    });

    const ua = await app.newTestUserAgent({tap: t});

    await t.test('Not found', async () => {
      app.exceptionFormat = 'html';
      (await ua.getOk('/does_not_exist'))
        .statusIs(404)
        .typeIs('text/html; charset=utf-8')
        .bodyLike(/Production not found/);

      app.exceptionFormat = 'txt';
      (await ua.getOk('/does_not_exist')).statusIs(404).typeIs('text/plain; charset=utf-8').bodyIs('Not Found');
    });

    await t.test('Exception', async t => {
      const dir = await Path.tempDir();
      const file = dir.child('production.log');
      app.log.destination = file.createWriteStream();

      app.exceptionFormat = 'html';
      (await ua.getOk('/exception'))
        .statusIs(500)
        .typeIs('text/html; charset=utf-8')
        .bodyLike(/Production exception/);

      app.exceptionFormat = 'txt';
      (await ua.getOk('/exception')).statusIs(500).typeIs('text/plain; charset=utf-8').bodyIs('Internal Server Error');

      t.same(app.log.history, []);
      t.match(await file.readFile(), /Error: Another test exception/);
    });

    await ua.stop();
  });

  await t.test('WebSocket', async t => {
    const app = mojo();

    app.log.level = 'debug';

    app.websocket('/ws/exception/before/sync').to(() => {
      throw new Error('Sync WebSocket test exception before');
    });

    app.websocket('/ws/exception/before/async').to(async () => {
      throw new Error('Async WebSocket test exception before');
    });

    app.websocket('/ws/exception/after/async').to(ctx => {
      ctx.plain(async () => {
        throw new Error('Async WebSocket test exception after');
      });
    });

    app.websocket('/ws/exception/after/sync').to(ctx => {
      ctx.on('connection', () => {
        throw new Error('Sync WebSocket test exception after');
      });
    });

    app.websocket('/ws/exception/iterator').to(ctx => {
      ctx.plain(async ws => {
        // eslint-disable-next-line no-unused-vars
        for await (const message of ws) {
          throw new Error('WebSocket iterator test exception');
        }
      });
    });

    app.websocket('/ws/exception/event').to(ctx => {
      ctx.on('connection', ws => {
        ws.on('message', () => {
          throw new Error('WebSocket event test exception');
        });
      });
    });

    app.websocket('/ws/exception/ping').to(ctx => {
      ctx.on('connection', ws => {
        ws.on('ping', () => {
          throw new Error('WebSocket ping test exception');
        });
      });
    });

    app.websocket('/ws/exception/pong').to(ctx => {
      ctx.on('connection', ws => {
        ws.on('pong', () => {
          throw new Error('WebSocket pong test exception');
        });
        ws.ping('test');
      });
    });

    app.websocket('/ws/exception/close').to(ctx => {
      ctx.on('connection', ws => {
        ws.on('close', () => {
          throw new Error('WebSocket close test exception');
        });
      });
    });

    const ua = await app.newTestUserAgent({tap: t});

    await t.test('WebSocket exception (during handshake and sync)', async t => {
      const dir = await Path.tempDir();
      const file = dir.child('websocket1a.log');
      app.log.destination = file.createWriteStream();

      let result;
      try {
        await ua.websocket('/ws/exception/before/sync');
      } catch (error) {
        result = error;
      }

      t.match(result, {code: 'ECONNRESET'});
      t.match(await file.readFile(), /Error: Sync WebSocket test exception before/);
    });

    await t.test('WebSocket exception (during handshake and async)', async t => {
      const dir = await Path.tempDir();
      const file = dir.child('websocket1b.log');
      app.log.destination = file.createWriteStream();

      let result;
      try {
        await ua.websocket('/ws/exception/before/async');
      } catch (error) {
        result = error;
      }

      t.match(result, {code: 'ECONNRESET'});
      t.match(await file.readFile(), /Error: Async WebSocket test exception before/);
    });

    await t.test('WebSocket exception (after handshake and async)', async t => {
      const dir = await Path.tempDir();
      const file = dir.child('websocket2a.log');
      app.log.destination = file.createWriteStream();

      const ws = await ua.websocket('/ws/exception/after/async');
      const code = await new Promise(resolve => ws.on('close', resolve));

      t.equal(code, 1011);
      t.match(await file.readFile(), /Error: Async WebSocket test exception after/);
    });

    await t.test('WebSocket exception (after handshake and sync)', async t => {
      const dir = await Path.tempDir();
      const file = dir.child('websocket2b.log');
      app.log.destination = file.createWriteStream();

      const ws = await ua.websocket('/ws/exception/after/sync');
      const code = await new Promise(resolve => ws.on('close', resolve));

      t.equal(code, 1011);
      t.match(await file.readFile(), /Error: Sync WebSocket test exception after/);
    });

    await t.test('WebSocket exception (iterator)', async t => {
      const dir = await Path.tempDir();
      const file = dir.child('websocket3a.log');
      app.log.destination = file.createWriteStream();

      const ws = await ua.websocket('/ws/exception/iterator');
      await ws.send('test');
      const code = await new Promise(resolve => ws.on('close', resolve));

      t.equal(code, 1011);
      t.match(await file.readFile(), /Error: WebSocket iterator test exception/);
    });

    await t.test('WebSocket exception (events)', async t => {
      const dir = await Path.tempDir();
      const file = dir.child('websocket3b.log');
      app.log.destination = file.createWriteStream();

      const ws = await ua.websocket('/ws/exception/event');
      await ws.send('test');
      const code = await new Promise(resolve => ws.on('close', resolve));

      t.equal(code, 1011);
      t.match(await file.readFile(), /Error: WebSocket event test exception/);
    });

    await t.test('WebSocket exception (ping)', async t => {
      const dir = await Path.tempDir();
      const file = dir.child('websocket3c.log');
      app.log.destination = file.createWriteStream();

      const ws = await ua.websocket('/ws/exception/ping');
      await ws.ping('test');
      const code = await new Promise(resolve => ws.on('close', resolve));

      t.equal(code, 1011);
      t.match(await file.readFile(), /Error: WebSocket ping test exception/);
    });

    await t.test('WebSocket exception (pong)', async t => {
      const dir = await Path.tempDir();
      const file = dir.child('websocket3d.log');
      app.log.destination = file.createWriteStream();

      const ws = await ua.websocket('/ws/exception/pong');
      const code = await new Promise(resolve => ws.on('close', resolve));

      t.equal(code, 1011);
      t.match(await file.readFile(), /Error: WebSocket pong test exception/);
    });

    await t.test('WebSocket exception (close)', async t => {
      const dir = await Path.tempDir();
      const file = dir.child('websocket3e.log');
      app.log.destination = file.createWriteStream();

      const ws = await ua.websocket('/ws/exception/close');
      ws.close(1000);
      const code = await new Promise(resolve => ws.on('close', resolve));

      t.equal(code, 1000);
      t.match(await file.readFile(), /Error: WebSocket close test exception/);
    });

    await ua.stop();
  });

  await t.test('Async string exception', async t => {
    const app = mojo({mode: 'development'});

    const dir = await Path.tempDir();
    const file = dir.child('development.log');
    app.log.destination = file.createWriteStream();
    app.log.level = 'warn';

    app.any('/async/exception', async () => {
      function myAsyncFunction() {
        return new Promise(() => {
          throw 'Just a string!';
        });
      }

      await myAsyncFunction();
    });

    const ua = await app.newTestUserAgent({tap: t});

    app.exceptionFormat = 'txt';
    (await ua.getOk('/async/exception'))
      .statusIs(500)
      .typeIs('text/plain; charset=utf-8')
      .bodyLike(/Just a string!/);

    app.exceptionFormat = 'html';
    (await ua.getOk('/async/exception'))
      .statusIs(500)
      .typeIs('text/html; charset=utf-8')
      .bodyLike(/Just a string!/);

    t.equal(app.log.history[0].level, 'error');
    t.match(app.log.history[0].msg, /Error: Just a string!/);
    t.equal(app.log.history[0].level, 'error');
    t.match(app.log.history[0].msg, /Error: Just a string!/);
    t.same(app.log.history[2], undefined);

    await ua.stop();
  });

  await t.test('Bad controller exceptions', async t => {
    const app = mojo({mode: 'development'});
    app.router.controllers['bar'] = null;
    app.router.controllers['baz'] = class {};

    app.any('/missing/controller').to('foo#one');
    app.any('/no/default/export').to('bar#two');
    app.any('/missing/action').to('baz#three');

    const ua = await app.newTestUserAgent({tap: t});

    const logs = app.log.capture('trace');
    (await ua.getOk('/missing/controller'))
      .statusIs(500)
      .typeIs('text/plain; charset=utf-8')
      .bodyLike(/Controller "foo" does not exist/);
    logs.stop();
    t.match(logs.toString(), /Controller "foo" does not exist/);

    const logs2 = app.log.capture('trace');
    (await ua.getOk('/no/default/export'))
      .statusIs(500)
      .typeIs('text/plain; charset=utf-8')
      .bodyLike(/Controller "bar" does not have a default export/);
    logs2.stop();
    t.match(logs2.toString(), /Controller "bar" does not have a default export/);

    const logs3 = app.log.capture('trace');
    (await ua.getOk('/missing/action'))
      .statusIs(500)
      .typeIs('text/plain; charset=utf-8')
      .bodyLike(/Action "three" does not exist/);
    logs3.stop();
    t.match(logs3.toString(), /Action "three" does not exist/);

    await ua.stop();
  });
});
