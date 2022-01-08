import {app} from './support/ts/full-app/lib/index.js';
import t from 'tap';

t.test('TypeScript app', async t => {
  const ua = await app.newTestUserAgent({tap: t});

  await t.test('Hello World', async () => {
    (await ua.getOk('/')).statusIs(200).bodyIs('Hello TypeScript!');
  });

  await t.test('Controller', async () => {
    (await ua.getOk('/hello')).statusIs(200).bodyLike(/Hello TypeScript controller!/);
  });

  await t.test('Context decorator', async () => {
    (await ua.getOk('/decorate/hello')).statusIs(200).bodyIs('Hello Test!');
  });

  await ua.stop();
});
