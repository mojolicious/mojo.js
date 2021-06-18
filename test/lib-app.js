import File from '../lib/file.js';
import {app as distApp} from './support/lib-app/dist/index.js';
import {app} from './support/lib-app/index.js';
import {app as libApp} from './support/lib-app/lib/index.js';
import {app as srcApp} from './support/lib-app/src/index.js';
import t from 'tap';

t.test('Lib app', async t => {
  const client = await app.newTestClient({tap: t});
  const distClient = await distApp.newTestClient({tap: t});
  const libClient = await libApp.newTestClient({tap: t});
  const srcClient = await srcApp.newTestClient({tap: t});

  const home = File.currentFile().sibling('support', 'lib-app');

  await t.test('none', async t => {
    t.equal(app.home.toString(), home.toString());
    t.equal(app.cli.commandPaths[1], home.child('cli').toString());
    t.equal(app.router.controllerPaths[0], home.child('controllers').toString());
    t.equal(app.static.publicPaths[1], home.child('public').toString());
    t.equal(app.renderer.viewPaths[1], home.child('views').toString());

    (await client.getOk('/')).statusIs(200).headerExists('Content-Length').bodyIs('none');
  });

  await t.test('dist', async t => {
    t.equal(distApp.home.toString(), home.toString());
    t.equal(distApp.cli.commandPaths[1], home.child('dist', 'cli').toString());
    t.equal(distApp.router.controllerPaths[0], home.child('dist', 'controllers').toString());
    t.equal(distApp.static.publicPaths[1], home.child('public').toString());
    t.equal(distApp.renderer.viewPaths[1], home.child('views').toString());

    (await distClient.getOk('/')).statusIs(200).headerExists('Content-Length').bodyIs('dist');
  });

  await t.test('lib', async t => {
    t.equal(libApp.home.toString(), home.toString());
    t.equal(libApp.cli.commandPaths[1], home.child('lib', 'cli').toString());
    t.equal(libApp.router.controllerPaths[0], home.child('lib', 'controllers').toString());
    t.equal(libApp.static.publicPaths[1], home.child('public').toString());
    t.equal(libApp.renderer.viewPaths[1], home.child('views').toString());

    (await libClient.getOk('/')).statusIs(200).headerExists('Content-Length').bodyIs('lib');
  });

  await t.test('src', async t => {
    t.equal(srcApp.home.toString(), home.toString());
    t.equal(srcApp.cli.commandPaths[1], home.child('src', 'cli').toString());
    t.equal(srcApp.router.controllerPaths[0], home.child('src', 'controllers').toString());
    t.equal(srcApp.static.publicPaths[1], home.child('public').toString());
    t.equal(srcApp.renderer.viewPaths[1], home.child('views').toString());

    (await srcClient.getOk('/')).statusIs(200).headerExists('Content-Length').bodyIs('src');
  });

  await client.stop();
  await distClient.stop();
  await libClient.stop();
  await srcClient.stop();
});
