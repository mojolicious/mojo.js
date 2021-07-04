import {app} from './support/ts-app/lib/index.js';
import t from 'tap';

t.test('TypeScript app', async t => {
  const client = await app.newTestClient({tap: t});

  await t.test('Hello World', async () => {
    (await client.getOk('/')).statusIs(200).bodyIs('Hello TypeScript!');
  });

  await t.test('Controller', async () => {
    (await client.getOk('/hello')).statusIs(200).bodyLike(/Hello TypeScript controller!/);
  });

  await client.stop();
});
