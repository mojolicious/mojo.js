import t from 'tap';
import {app} from './support/command-app/index.js';
import {captureOutput} from '../lib/util.js';

t.test('Command app', async t => {
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

    const output2 = await captureOutput(async () => {
      await app.cli.start('eval', 'throw new Error("test error")');
    });
    t.match(output2, /test error/);
  });

  await t.test('version', async t => {
    const output = await captureOutput(async () => {
      await app.cli.start('version');
    });
    t.match(output, /mojo\.js\s+\(\d\.\d\.\d\)/);
  });
});
