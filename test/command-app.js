import t from 'tap';
import {app} from './support/command-app/index.js';

t.test('Command app', async t => {
  await t.test('CLI', async t => {
    t.equal(await app.cli.start('test', 'works'), 'Test works!');
    t.equal(app.cli.commands.test.description, 'Test description');
    t.equal(app.cli.commands.test.usage, 'Test usage');
  });
});
