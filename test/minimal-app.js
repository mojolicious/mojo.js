import {app} from './support/js/minimal-app/myapp.js';
import t from 'tap';

t.test('Minimal app', async t => {
  const ua = await app.newTestUserAgent({tap: t});

  await t.test('Home directory', async t => {
    t.ok(app.home);
    t.ok(await app.home.exists());
    t.ok(await app.home.child('myapp.js').exists());
  });

  await t.test('Hello World', async () => {
    (await ua.getOk('/')).statusIs(200).headerIs('Content-Length', '11').bodyIs('Hello Mojo!');
  });

  await ua.stop();
});
