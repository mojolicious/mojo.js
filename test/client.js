import t from 'tap';
import {tempdir} from '../lib/util.js';
import App from '../lib/app.js';
import Client from '../lib/client.js';
import Server from '../lib/server.js';

t.test('Client', async t => {
  const app = new App();
  app.get('/', ctx => ctx.render({text: 'Hello Mojo!'}));

  const server = new Server(app, {listen: ['http://*'], quiet: true});
  await server.start();
  const client = new Client({baseURL: server.urls[0]});

  await t.test('Hello World', async t => {
    const res = await client.get('/');
    t.equal(res.status, 200, 'right status');
    t.equal(await res.text(), 'Hello Mojo!', 'right content');
    t.done();
  });

  await t.test('Stream', async t => {
    const res = await client.get('/');
    t.equal(res.status, 200, 'right status');
    const dir = await tempdir();
    const file = dir.child('hello.txt');
    await res.pipe(file.createWriteStream());
    t.equal(await file.readFile('utf8'), 'Hello Mojo!', 'right content');
    t.done();
  });

  await server.stop();
  t.done();
});
