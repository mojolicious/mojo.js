import mojo, {TestUserAgent} from '../lib/core.js';
import {captureOutput} from '../lib/util.js';
import {app} from './support/js/command-app/index.js';
import Path from '@mojojs/path';
import t from 'tap';

t.test('Command app', async t => {
  await t.test('Help', async t => {
    const output = await captureOutput(async () => {
      await app.cli.start();
    });
    t.match(output, /eval.*get.*server.*version/s);

    const output2 = await captureOutput(async () => {
      await app.cli.start('get', '-h');
    });
    t.match(output2, /Usage: APPLICATION get/);

    const output3 = await captureOutput(async () => {
      await app.cli.start('-h');
    });
    t.match(output3, /eval.*get.*server.*version/s);
  });

  await t.test('Unknown command', async t => {
    const output = await captureOutput(async () => {
      await app.cli.start('does-not-exist');
    });
    t.match(output, /Unknown command "does-not-exist", maybe you need to install it\?/s);
  });

  await t.test('Custom command', async t => {
    let result;
    const output = await captureOutput(async () => {
      result = await app.cli.start('test', 'works');
    });
    t.match(output, /Test works!/s);
    t.same(result, null);
    t.equal(app.cli.commands.test.description, 'Test description');
    t.equal(app.cli.commands.test.usage, 'Test usage');
  });

  await t.test('eval', async t => {
    const output = await captureOutput(async () => {
      await app.cli.start('eval', '-v', '100 + 924');
    });
    t.match(output, /1024/);
    t.match(app.cli.commands.eval.description, /Run code against application/);
    t.match(app.cli.commands.eval.usage, /Usage: APPLICATION eval/);

    const output2 = await captureOutput(async () => {
      await app.cli.start('eval', 'await 100 + 924');
    });
    t.equal(output2, '');

    const output3 = await captureOutput(async () => {
      await app.cli.start('eval', '-v', 'await 100 + 924');
    });
    t.match(output3, /1024/);

    let output4, error;
    app.addHelper('testError', () => {
      throw new Error('test error');
    });
    try {
      output4 = await captureOutput(async () => {
        await app.cli.start('eval', 'app.newMockContext().testError()');
      });
    } catch (err) {
      error = err;
    }
    t.same(output4, undefined);
    t.match(error, /test error/);
  });

  await t.test('repl', async t => {
    const output = await captureOutput(async () => {
      process.stdin.push('.exit\n');
      await app.cli.start('repl');
    });
    t.match(output, /> /);
    t.match(app.cli.commands.repl.description, /Start a repl for application/);
    t.match(app.cli.commands.repl.usage, /Usage: APPLICATION repl/);
  });

  await t.test('get', async t => {
    const output = await captureOutput(async () => {
      await app.cli.start('get', '/');
    });
    t.match(output.toString(), /Hello Mojo!/);
    t.match(app.cli.commands.get.description, /Perform HTTP request/);
    t.match(app.cli.commands.get.usage, /Usage: APPLICATION get/);

    const output2 = await captureOutput(
      async () => {
        await app.cli.start('get', '-v', '/');
      },
      {stderr: true}
    );
    t.match(output2.toString(), /GET.*Host.*Content-Length.*Hello Mojo!/s);

    const output3 = await captureOutput(
      async () => {
        await app.cli.start('get', '-H', 'Accept: application/json', '-v', '/');
      },
      {stderr: true}
    );
    t.match(output3.toString(), /GET.*Accept.*Content-Length.*Hello Mojo!/s);

    const output4 = await captureOutput(
      async () => {
        await app.cli.start('get', '-b', 'works', '-v', '/');
      },
      {stderr: true}
    );
    t.match(output4.toString(), /GET.*Content-Length.*Content-Length.*Hello Mojo!/s);

    const output5 = await captureOutput(
      async () => {
        await app.cli.start('get', '-r', '-X', 'POST', '-v', '/redirect');
      },
      {stderr: true}
    );
    t.match(output5.toString(), /GET.*\/.*Content-Length.*Hello Mojo!/s);

    const output6 = await captureOutput(
      async () => {
        await app.cli.start('get', '/index.html', 'h2');
      },
      {stderr: true}
    );
    t.match(output6.toString(), /Second/s);
    t.notMatch(output6.toString(), /First/s);
  });

  await t.test('routes', async t => {
    const output = await captureOutput(async () => {
      await app.cli.start('routes', '-h');
    });
    t.match(output.toString(), /Usage: APPLICATION routes/);
    t.match(app.cli.commands.routes.description, /Show available routes/);
    t.match(app.cli.commands.routes.usage, /Usage: APPLICATION routes/);

    const output2 = await captureOutput(async () => {
      await app.cli.start('routes');
    });
    t.match(output2.toString(), /\/.*\*/);
    t.match(output2.toString(), /\/foo.*GET.*foo/m);
    t.match(output2.toString(), /\s{2}\+\/bar.*POST.*bar/m);
    t.match(output2.toString(), /\s{2}\+\/baz.*GET.*baz/m);

    const output3 = await captureOutput(async () => {
      await app.cli.start('routes', '-v');
    });
    t.match(output3.toString(), /\/.*\*.*\/\^\/s/);
    t.match(output3.toString(), /\/foo.*GET.*foo.*\/\^\\\/foo\/s/m);
    t.match(output3.toString(), /\s{2}\+\/bar.*POST.*bar.*\/\^\\\/bar\/s/m);
    t.match(output3.toString(), /\s{2}\+\/baz.*GET.*baz.*\/\^\\\/baz\\\/\?\\\.\(html\)\$\/s/m);
  });

  await t.test('server', async t => {
    const output = await captureOutput(async () => {
      await app.cli.start('server', '-h');
    });
    t.match(output.toString(), /Usage: APPLICATION server/);
    t.match(app.cli.commands.server.description, /Start application with HTTP server/);
    t.match(app.cli.commands.server.usage, /Usage: APPLICATION server/);

    const app2 = mojo({mode: 'production'});
    app2.get('/', async ctx => {
      ctx.res._raw.on('finish', () => process.emit('SIGUSR2', 'SIGUSR2'));
      await ctx.render({text: 'Stopping server'});
    });
    const hookPromise = new Promise(resolve => app2.addAppHook('server:stop', () => resolve(true)));
    const intBefore = process.listenerCount('SIGINT');
    const termBefore = process.listenerCount('SIGTERM');
    const usr2Before = process.listenerCount('SIGUSR2');
    const output2 = await captureOutput(async () => {
      await app2.cli.start('server', '-L', 'error', '-l', 'http://*');
    });
    t.equal(process.listenerCount('SIGINT'), intBefore + 1);
    t.equal(process.listenerCount('SIGTERM'), termBefore + 1);
    t.equal(process.listenerCount('SIGUSR2'), usr2Before + 1);
    t.match(output2.toString(), /Web application available at http:/);
    const ua = new TestUserAgent({tap: t});
    const match = output2.match(/(http:\/\/.+)$/s);
    t.notSame(match, null);
    (await ua.getOk(match[1])).statusIs(200).bodyIs('Stopping server');
    t.same(await hookPromise, true);
    t.equal(process.listenerCount('SIGINT'), intBefore);
    t.equal(process.listenerCount('SIGTERM'), termBefore);
    t.equal(process.listenerCount('SIGUSR2'), usr2Before);
  });

  await t.test('version', async t => {
    const output = await captureOutput(async () => {
      await app.cli.start('version');
    });
    t.match(output, /mojo\.js\s+\(\d+\.\d+\.\d+(?:-(?:alpha|beta)\.\d+)?\)/);
    t.match(app.cli.commands.version.description, /Show version/);
    t.match(app.cli.commands.version.usage, /Usage: APPLICATION version/);
  });

  await t.test('create-lite-app', async t => {
    const dir = await Path.tempDir();

    const output = await captureOutput(async () => {
      await app.cli.start('create-lite-app', '-h');
    });
    t.match(output.toString(), /Usage: APPLICATION create-lite-app/);
    t.match(app.cli.commands['create-lite-app'].description, /Create single file application/);
    t.match(app.cli.commands['create-lite-app'].usage, /Usage: APPLICATION create-lite-app/);

    const cwd = process.cwd();
    process.chdir(dir.toString());
    const file = dir.child('myapp.js');
    const output2 = await captureOutput(async () => {
      await app.cli.start('create-lite-app', 'myapp.js');
    });
    t.match(output2.toString(), /\[write\].+myapp\.js/);
    t.same(await file.exists(), true);
    t.match(await file.readFile('utf8'), /import mojo from '@mojojs\/core'/);
    t.match(output2.toString(), /\[write\].+package\.json/);
    t.same(await dir.child('package.json').exists(), true);
    t.match(await dir.child('package.json').readFile('utf8'), /module/);

    const output3 = await captureOutput(async () => {
      await app.cli.start('create-lite-app', 'myapp.js');
    });
    t.match(output3.toString(), /\[exists\].+myapp\.js/);

    const file2 = dir.child('index.js');
    const output4 = await captureOutput(async () => {
      await app.cli.start('create-lite-app');
    });
    t.match(output4.toString(), /\[write\].+index\.js/);
    t.same(await file2.exists(), true);
    t.match(await file2.readFile('utf8'), /import mojo from '@mojojs\/core'/);
    process.chdir(cwd);
  });

  await t.test('create-full-app', async t => {
    const dir = await Path.tempDir();

    const output = await captureOutput(async () => {
      await app.cli.start('create-full-app', '-h');
    });
    t.match(output.toString(), /Usage: APPLICATION create-full-app/);
    t.match(app.cli.commands['create-full-app'].description, /Create application directory structure/);
    t.match(app.cli.commands['create-full-app'].usage, /Usage: APPLICATION create-full-app/);

    const cwd = process.cwd();
    process.chdir(dir.toString());
    const output2 = await captureOutput(async () => {
      await app.cli.start('create-full-app');
    });
    t.match(output2.toString(), /\[write\].+config\.yml/);
    t.same(await dir.child('config.yml').exists(), true);
    t.match(await dir.child('config.yml').readFile('utf8'), /secrets:/);
    t.match(output2.toString(), /\[write\].+index\.js/);
    t.same(await dir.child('index.js').exists(), true);
    t.match(await dir.child('index.js').readFile('utf8'), /import mojo.+from '@mojojs\/core'/);
    t.match(output2.toString(), /\[write\].+controllers.+example\.js/);
    t.same(await dir.child('controllers', 'example.js').exists(), true);
    t.match(await dir.child('controllers', 'example.js').readFile('utf8'), /export default class Controller/);
    t.match(output2.toString(), /\[write\].+default\.html\.mt/);
    t.same(await dir.child('views', 'layouts', 'default.html.mt').exists(), true);
    t.match(await dir.child('views', 'layouts', 'default.html.mt').readFile('utf8'), /Welcome/);
    t.match(output2.toString(), /\[write\].+welcome\.html\.mt/);
    t.same(await dir.child('views', 'example', 'welcome.html.mt').exists(), true);
    t.match(await dir.child('views', 'example', 'welcome.html.mt').readFile('utf8'), /This page/);
    t.match(output2.toString(), /\[write\].+test.+example\.js/);
    t.same(await dir.child('test', 'example.js').exists(), true);
    t.match(await dir.child('test', 'example.js').readFile('utf8'), /getOk/);
    t.match(output2.toString(), /\[write\].+package\.json/);
    t.same(await dir.child('package.json').exists(), true);
    t.match(await dir.child('package.json').readFile('utf8'), /module/);

    const output3 = await captureOutput(async () => {
      await app.cli.start('create-full-app');
    });
    t.match(output3.toString(), /\[exists\].+config\.yml/);
    t.match(output3.toString(), /\[exists\].+index\.js/);
    t.match(output3.toString(), /\[exists\].+controllers.+example\.js/);
    t.match(output3.toString(), /\[exists\].+default\.html\.mt/);
    t.match(output3.toString(), /\[exists\].+welcome\.html\.mt/);
    t.match(output3.toString(), /\[exists\].+test.+example\.js/);

    const dir2 = dir.child('test-app');
    await dir2.mkdir();
    process.chdir(dir2.toString());
    const output4 = await captureOutput(async () => {
      await app.cli.start('create-full-app', 'myapp.js');
    });
    t.match(output4.toString(), /\[write\].+test-app.+myapp\.js/);
    t.same(await dir2.child('myapp.js').exists(), true);
    t.match(await dir2.child('myapp.js').readFile('utf8'), /import mojo.+from '@mojojs\/core'/);
    process.chdir(cwd);
  });

  await t.test('Command hooks', async t => {
    const output = await captureOutput(async () => {
      await app.cli.start('hook-command-get', '/');
    });
    t.match(output.toString(), /before: development/);
    t.match(output.toString(), /after: development/);
    t.match(output.toString(), /Hello Mojo!/);
  });
});
