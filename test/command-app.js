import t from 'tap';
import {app} from './support/command-app/index.js';
import {captureOutput} from '../lib/util.js';

t.test('Command app', async t => {
  await t.test('Help', async t => {
    const output = await captureOutput(async () => {
      await app.cli.start();
    });
    t.match(output, /eval.*get.*server.*version/s);

    const output2 = await captureOutput(async () => {
      await app.cli.start('get', '-h');
    });
    t.match(output2, /Usage: APPLICATION get/);

    const output3 = await captureOutput(async () => {
      await app.cli.start('-h');
    });
    t.match(output3, /eval.*get.*server.*version/s);
  });

  await t.test('Custom command', async t => {
    t.equal(await app.cli.start('test', 'works'), 'Test works!');
    t.equal(app.cli.commands.test.description, 'Test description');
    t.equal(app.cli.commands.test.usage, 'Test usage');
  });

  await t.test('eval', async t => {
    const output = await captureOutput(async () => {
      await app.cli.start('eval', '100 + 924');
    });
    t.match(output, /1024/);
    t.match(app.cli.commands.eval.description, /Run code against application/);
    t.match(app.cli.commands.eval.usage, /Usage: APPLICATION eval/);

    const output2 = await captureOutput(async () => {
      await app.cli.start('eval', 'throw new Error("test error")');
    });
    t.match(output2, /test error/);
  });

  await t.test('get', async t => {
    const output = await captureOutput(async () => {
      await app.cli.start('get', '/');
    });
    t.match(output.toString('utf8'), /Hello Mojo!/);
    t.match(app.cli.commands.get.description, /Perform HTTP request/);
    t.match(app.cli.commands.get.usage, /Usage: APPLICATION get/);

    const output2 = await captureOutput(async () => {
      await app.cli.start('get', '-v', '/');
    }, {stderr: true});
    t.match(output2.toString('utf8'), /Content-Length.*Hello Mojo!/s);
  });

  await t.test('server', async t => {
    const output = await captureOutput(async () => {
      await app.cli.start('server', '-h');
    });
    t.match(output.toString('utf8'), /Usage: APPLICATION server/);
    t.match(app.cli.commands.server.description, /Start application with HTTP server/);
    t.match(app.cli.commands.server.usage, /Usage: APPLICATION server/);
  });

  await t.test('version', async t => {
    const output = await captureOutput(async () => {
      await app.cli.start('version');
    });
    t.match(output, /mojo\.js\s+\(\d\.\d\.\d\)/);
    t.match(app.cli.commands.version.description, /Show version/);
    t.match(app.cli.commands.version.usage, /Usage: APPLICATION version/);
  });
});
