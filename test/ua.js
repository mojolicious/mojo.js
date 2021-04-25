'use strict';

import t from 'tap';
import App from '../lib/app.js';
import Server from '../lib/server.js';
import UserAgent from '../lib/ua.js';

t.test('UserAgent', async t => {
  const app = new App();
  app.get('/', ctx => ctx.render({text: 'Hello Mojo!'}));

  const server = new Server(app, {listen: ['http://*'], quiet: true});
  await server.start();

  await t.test('Hello World', async t => {
    const ua = new UserAgent({name: 'mojo', baseURL: server.urls[0]});
    const res = await ua.get('/');
    t.equal(res.code, 200, 'right status');
    t.equal(await res.text(), 'Hello Mojo!', 'right content');
    t.done();
  });

  await server.stop();
  t.done();
});
