import {app} from './support/ts-app/lib/index.js';
import t from 'tap';

t.test('TypeScript app', async t => {
  const ua = await app.newTestUserAgent({tap: t});

  await t.test('Hello World', async () => {
    (await ua.getOk('/')).statusIs(200).bodyIs('Hello TypeScript!');
  });

  await t.test('Controller', async () => {
    (await ua.getOk('/hello')).statusIs(200).bodyLike(/Hello TypeScript controller!/);
  });

  await t.test('Query Parameter Parse', async () => {
    (await ua.getOk('/hello-name', {query: {name: 'User'}})).statusIs(200).bodyLike(/Hello User!/);
  });

  await t.test('Post JSON Body Parse', async () => {
    (await ua.postOk('/data', {json: {name: 'User'}})).statusIs(200).jsonIs({greeting: 'Hello User'});
  });

  await t.test('Get Path Param Parse', async () => {
    (await ua.getOk('/data/1')).statusIs(200).jsonIs({id: 1});
  });

  await ua.stop();
});
