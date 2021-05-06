import {app} from './support/static-app/index.js';
import t from 'tap';

t.test('Static app', async t => {
  const client = await app.newTestClient({tap: t});

  await t.test('0', async t => {
    (await client.getOk('/public/0')).statusIs(200).headerIs('Content-Length', '1').bodyIs('0');
    (await client.getOk('/0')).statusIs(200).headerIs('Content-Length', '4').bodyIs('Zero');
    (await client.getOk('/public/../index.js')).statusIs(404);
  });

  await client.stop();
});
