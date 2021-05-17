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
      t.equal(app.log.historySize, 10);
      t.equal(app.log.level, 'debug');
      (await client.getOk('/')).statusIs(200).bodyIs('Hello World!');
    });

    await t.test('Not found', async t => {
      app.exceptionFormat = 'html';
      (await client.getOk('/does_not_exist')).statusIs(404).headerIs('Content-Type', 'text/html;charset=UTF-8')
        .bodyLike(/This application is in.*development.*mode/).bodyUnlike(/no-raptor\.png/);

      app.exceptionFormat = 'txt';
      (await client.getOk('/does_not_exist')).statusIs(404).headerIs('Content-Type', 'text/plain;charset=UTF-8')
        .bodyIs('Not Found');

      app.exceptionFormat = 'json';
      (await client.getOk('/does_not_exist')).statusIs(404).headerIs('Content-Type', 'application/json;charset=UTF-8')
        .jsonIs({error: {message: 'Not Found'}});
      app.exceptionFormat = 'html';
    });

    await t.test('Exception', async t => {
      const dir = await File.tempDir();
      const file = dir.child('development.log');
      app.log.destination = file.createWriteStream();

      app.exceptionFormat = 'html';
      (await client.getOk('/exception')).statusIs(500).headerIs('Content-Type', 'text/html;charset=UTF-8')
        .bodyLike(/This application is in.*development.*mode/).bodyUnlike(/\/public\/mojo\/failraptor\.png/);

      app.exceptionFormat = 'txt';
      (await client.getOk('/exception')).statusIs(500).headerIs('Content-Type', 'text/plain;charset=UTF-8')
        .bodyLike(/Test exception/);

      app.exceptionFormat = 'json';
      (await client.getOk('/exception')).statusIs(500).headerIs('Content-Type', 'application/json;charset=UTF-8')
        .bodyLike(/Test exception/);
      app.exceptionFormat = 'html';

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
      t.equal(app.log.historySize, 0);
      t.equal(app.log.level, 'info');
      (await client.getOk('/')).statusIs(200).bodyIs('Hello World!');
    });

    await t.test('Not found', async t => {
      app.exceptionFormat = 'html';
      (await client.getOk('/does_not_exist')).statusIs(404).bodyUnlike(/This application is in.*development.*mode/)
        .bodyLike(/no-raptor\.png/);

      app.exceptionFormat = 'txt';
      (await client.getOk('/does_not_exist')).statusIs(404).headerIs('Content-Type', 'text/plain;charset=UTF-8')
        .bodyIs('Not Found');

      app.exceptionFormat = 'json';
      (await client.getOk('/does_not_exist')).statusIs(404).headerIs('Content-Type', 'application/json;charset=UTF-8')
        .jsonIs({error: {message: 'Not Found'}});
      app.exceptionFormat = 'html';
    });

    await t.test('Exception', async t => {
      const dir = await File.tempDir();
      const file = dir.child('production.log');
      app.log.destination = file.createWriteStream();

      app.exceptionFormat = 'html';
      (await client.getOk('/exception')).statusIs(500).headerIs('Content-Type', 'text/html;charset=UTF-8')
        .bodyUnlike(/This application is in.*development.*mode/).bodyLike(/failraptor\.png/);

      app.exceptionFormat = 'txt';
      (await client.getOk('/exception')).statusIs(500).headerIs('Content-Type', 'text/plain;charset=UTF-8')
        .bodyIs('Internal Server Error');

      app.exceptionFormat = 'json';
      (await client.getOk('/exception')).statusIs(500).headerIs('Content-Type', 'application/json;charset=UTF-8')
        .jsonIs({error: {message: 'Internal Server Error'}});
      app.exceptionFormat = 'html';

      t.same(app.log.history, []);
      t.match(await file.readFile(), /Error: Test exception/);
    });

    await client.stop();
  });
});
