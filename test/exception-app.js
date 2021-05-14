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
      (await client.getOk('/does_not_exist')).statusIs(404).bodyLike(/This application is in.*development.*mode/);
      (await client.getOk('/does_not_exist')).statusIs(404).bodyUnlike(/no-raptor\.png/);
    });

    await t.test('Exception', async t => {
      const dir = await File.tempDir();
      const file = dir.child('development.log');
      app.log.destination = file.createWriteStream();

      (await client.getOk('/exception')).statusIs(500).bodyLike(/This application is in.*development.*mode/);
      (await client.getOk('/exception')).statusIs(500).bodyUnlike(/\/public\/mojo\/failraptor\.png/);

      t.equal(app.log.history[0].level, 'error');
      t.match(app.log.history[0].msg, /Error: Test exception/);
      t.equal(app.log.history[1].level, 'error');
      t.match(app.log.history[1].msg, /Error: Test exception/);
      t.same(app.log.history[2], undefined);
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
      (await client.getOk('/does_not_exist')).statusIs(404).bodyUnlike(/This application is in.*development.*mode/);
      (await client.getOk('/does_not_exist')).statusIs(404).bodyLike(/no-raptor\.png/);
    });

    await t.test('Exception', async t => {
      const dir = await File.tempDir();
      const file = dir.child('production.log');
      app.log.destination = file.createWriteStream();

      (await client.getOk('/exception')).statusIs(500).bodyUnlike(/This application is in.*development.*mode/);
      (await client.getOk('/exception')).statusIs(500).bodyLike(/failraptor\.png/);

      t.same(app.log.history, []);
      t.match(await file.readFile(), /Error: Test exception/);
    });

    await client.stop();
  });
});
