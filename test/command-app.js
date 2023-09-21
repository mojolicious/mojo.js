import {app} from './support/js/command-app/index.js';
import mojo, {TestUserAgent} from '../lib/core.js';
import Path from '@mojojs/path';
import {captureOutput} from '@mojojs/util';
import t from 'tap';

t.test('Command app', async t => {
  await t.test('Command detection', t => {
    const env = process.env;
    process.env = {};

    t.same(app.cli.detectCommand(), null);
    process.env.PATH_INFO = '/';
    t.equal(app.cli.detectCommand(), 'cgi');
    process.env.MOJO_NO_DETECT = '1';
    t.same(app.cli.detectCommand(), null);

    process.env = env;

    t.end();
  });

  await t.test('Help', async t => {
    const output = await captureOutput(async () => {
      await app.cli.start();
    });
    t.match(output, /eval.*get.*server.*version/s);
    t.notMatch(output, /create-/s);

    const output2 = await captureOutput(async () => {
      await app.cli.start('get', '-h');
    });
    t.match(output2, /Usage: APPLICATION get/);

    const output3 = await captureOutput(async () => {
      await app.cli.start('-h');
    });
    t.match(output3, /eval.*get.*server.*version/s);
    t.notMatch(output3, /create-/s);

    const output4 = await captureOutput(async () => {
      await app.cli.start('--show-all');
    });
    t.match(output4.toString(), /create-.+eval.*get.*server.*version/s);

    const output5 = await captureOutput(async () => {
      await app.cli.start('--help', '--show-all');
    });
    t.match(output5.toString(), /create-.+eval.*get.*server.*version/s);
  });

  await t.test('Unknown command', async t => {
    const output = await captureOutput(async () => {
      await app.cli.start('does-not-exist');
    });
    t.match(output, /Unknown command "does-not-exist", maybe you need to install it\?/s);
  });

  await t.test('Command hooks', async t => {
    const output = await captureOutput(async () => {
      await app.cli.start('hook-command-get', '/');
    });
    t.match(
      output.toString(),
      'command:before: developmentapp:start: developmentcommand:init: development getserver:start: development' +
        'Hello Mojo!' +
        'server:stop: developmentcommand:after: developmentapp:stop: development'
    );

    process.env.MOJO_COMMAND_TEST = '1';
    const output2 = await captureOutput(async () => {
      await app.cli.start();
    });
    t.match(output2.toString(), 'command:before: skip cliapp:start: development');
    delete process.env.MOJO_COMMAND_TEST;

    process.env.MOJO_COMMAND_TEST2 = '1';
    const output3 = await captureOutput(async () => {
      await app.cli.start();
    });
    t.match(output3.toString(), 'command:init: skip cli');
    delete process.env.MOJO_COMMAND_TEST2;
  });

  await t.test('Custom commands', async t => {
    let result;
    const output = await captureOutput(async () => {
      result = await app.cli.start('test', 'works');
    });
    t.match(output, /Test works!/s);
    t.same(result, null);
    t.equal(app.cli.commands.test.description, 'Test description');
    t.equal(app.cli.commands.test.usage, 'Test usage');

    const output2 = await captureOutput(async () => {
      result = await app.cli.start('another', 'works');
    });
    t.match(output2, /Test works!/s);
    t.same(result, null);
    t.equal(app.cli.commands.another.description, 'Another test description');
    t.equal(app.cli.commands.another.usage, 'Another test usage');
  });

  await t.test('Exception in command', async t => {
    const app = mojo({detectImport: false});

    const output = await captureOutput(async () => {
      await app.start();
    });
    t.match(output, /eval.*get.*server.*version/s);

    app.cli.commands['dies'] = async () => {
      throw new Error('Just a test');
    };
    const logs = app.log.capture();
    const output2 = await captureOutput(async () => {
      await app.start('dies');
    });
    logs.stop();
    t.match(logs.toString(), /error.+Just a test/);
    t.equal(output2.toString(), '');
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
    t.equal(output2.toString(), 'command:init: development eval');

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
    t.match(output2.toString(), /Content-Length.*Hello Mojo!/s);

    const output3 = await captureOutput(
      async () => {
        await app.cli.start('get', '-H', 'Accept: application/json', '-v', '/');
      },
      {stderr: true}
    );
    t.match(output3.toString(), /Content-Length.*Hello Mojo!/s);

    const output4 = await captureOutput(
      async () => {
        await app.cli.start('get', '-b', 'works', '-v', '/');
      },
      {stderr: true}
    );
    t.match(output4.toString(), /Content-Length.*Hello Mojo!/s);

    const output5 = await captureOutput(
      async () => {
        await app.cli.start('get', '-r', '-X', 'POST', '-v', '/redirect');
      },
      {stderr: true}
    );
    t.match(output5.toString(), /Content-Length.*Hello Mojo!/s);

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
    t.match(app.cli.commands.server.description, /Start application with HTTP and WebSocket server/);
    t.match(app.cli.commands.server.usage, /Usage: APPLICATION server/);

    const app2 = mojo({mode: 'production'});
    app2.get('/', async ctx => {
      ctx.on('finish', () => process.emit('SIGUSR2', 'SIGUSR2'));
      await ctx.render({text: 'Stopping server'});
    });
    const hookPromise = new Promise(resolve => app2.addAppHook('server:stop', () => resolve(true)));
    const intBefore = process.listenerCount('SIGINT');
    const termBefore = process.listenerCount('SIGTERM');
    const usr2Before = process.listenerCount('SIGUSR2');
    const output2 = await captureOutput(async () => {
      await app2.cli.start(
        'server',
        '--headers-timeout',
        '30000',
        '--keep-alive-timeout',
        '30000',
        '--request-timeout',
        '30000',
        '-r',
        '10',
        '-L',
        'error',
        '-l',
        'http://*'
      );
    });
    t.equal(process.listenerCount('SIGINT'), intBefore + 1);
    t.equal(process.listenerCount('SIGTERM'), termBefore + 1);
    t.equal(process.listenerCount('SIGUSR2'), usr2Before + 1);
    t.match(output2.toString(), /Web application available at http:/);
    const ua = new TestUserAgent({tap: t});
    const match = output2.toString().match(/(http:\/\/.+)$/s);
    t.notSame(match, null);
    (await ua.getOk(match[1])).statusIs(200).bodyIs('Stopping server');
    t.same(await hookPromise, true);
    t.equal(process.listenerCount('SIGINT'), intBefore);
    t.equal(process.listenerCount('SIGTERM'), termBefore);
    t.equal(process.listenerCount('SIGUSR2'), usr2Before);
  });

  await t.test('cgi', async t => {
    const env = process.env;
    process.env = {PATH_INFO: '/'};
    const output = await captureOutput(async () => {
      await app.cli.start('cgi');
    });

    t.match(output.toString(), /Content-Type: text\/plain; charset=utf-8/);
    t.match(output.toString(), /Status: 200 OK/);
    t.match(output.toString(), /Content-Length: 11/);
    t.match(output.toString(), /Hello Mojo!/);
    t.match(app.cli.commands.cgi.description, /Start application with CGI/);
    t.match(app.cli.commands.cgi.usage, /Usage: APPLICATION cgi/);

    process.env = {PATH_INFO: '/'};
    const output2 = await captureOutput(async () => {
      await app.cli.start();
    });
    process.env = env;

    t.match(output2.toString(), /Content-Type: text\/plain; charset=utf-8/);
    t.match(output2.toString(), /Status: 200 OK/);
    t.match(output2.toString(), /Content-Length: 11/);
    t.match(output2.toString(), /Hello Mojo!/);
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
    t.match(output2.toString(), /\[fixed\].+package\.json/);
    t.same(await dir.child('package.json').exists(), true);
    t.match(await dir.child('package.json').readFile('utf8'), /@mojojs/);

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
    t.match(output2.toString(), /\[write\].+default\.html\.tmpl/);
    t.same(await dir.child('views', 'layouts', 'default.html.tmpl').exists(), true);
    t.match(await dir.child('views', 'layouts', 'default.html.tmpl').readFile('utf8'), /Welcome/);
    t.match(output2.toString(), /\[write\].+welcome\.html\.tmpl/);
    t.same(await dir.child('views', 'example', 'welcome.html.tmpl').exists(), true);
    t.match(await dir.child('views', 'example', 'welcome.html.tmpl').readFile('utf8'), /This page/);
    t.match(output2.toString(), /\[write\].+test.+example\.js/);
    t.same(await dir.child('public', 'assets').exists(), true);
    t.same(await dir.child('public', 'index.html').exists(), true);
    t.same(await dir.child('test', 'example.js').exists(), true);
    t.match(await dir.child('test', 'example.js').readFile('utf8'), /getOk/);
    t.match(output2.toString(), /\[fixed\].+package\.json/);
    t.same(await dir.child('package.json').exists(), true);
    const pkg = JSON.parse(await dir.child('package.json').readFile('utf8'));
    t.equal(pkg.type, 'module');
    t.equal(typeof pkg.scripts.dev, 'string');
    t.match(pkg.scripts.dev, /nodemon index\.js/);
    t.equal(typeof pkg.scripts.start, 'string');
    t.match(pkg.scripts.start, /node index\.js/);
    t.equal(typeof pkg.scripts.test, 'string');
    t.match(pkg.scripts.test, /node --test/);
    t.equal(typeof pkg.devDependencies['nodemon'], 'string');
    t.equal(typeof pkg.devDependencies['tap'], 'string');

    const output3 = await captureOutput(async () => {
      await app.cli.start('create-full-app');
    });
    t.match(output3.toString(), /\[exists\].+config\.yml/);
    t.match(output3.toString(), /\[exists\].+index\.js/);
    t.match(output3.toString(), /\[exists\].+controllers.+example\.js/);
    t.match(output3.toString(), /\[exists\].+default\.html\.tmpl/);
    t.match(output3.toString(), /\[exists\].+welcome\.html\.tmpl/);
    t.match(output3.toString(), /\[exists\].+test.+example\.js/);

    const dir2 = dir.child('ts-app');
    await dir2.mkdir();
    process.chdir(dir2.toString());
    const output4 = await captureOutput(async () => {
      await app.cli.start('create-full-app', '--ts');
    });
    t.match(output4.toString(), /\[write\].+config\.yml/);
    t.same(await dir2.child('config.yml').exists(), true);
    t.match(await dir2.child('config.yml').readFile('utf8'), /secrets:/);
    t.match(output4.toString(), /\[write\].+src.+index\.ts/);
    t.same(await dir2.child('src', 'index.ts').exists(), true);
    t.match(await dir2.child('src', 'index.ts').readFile('utf8'), /import mojo.+from '@mojojs\/core'/);
    t.match(output4.toString(), /\[write\].+src.+controllers.+example\.ts/);
    t.same(await dir2.child('src', 'controllers', 'example.ts').exists(), true);
    t.match(await dir2.child('src', 'controllers', 'example.ts').readFile('utf8'), /export default class Controller/);
    t.match(output4.toString(), /\[write\].+default\.html\.tmpl/);
    t.same(await dir2.child('views', 'layouts', 'default.html.tmpl').exists(), true);
    t.match(await dir2.child('views', 'layouts', 'default.html.tmpl').readFile('utf8'), /Welcome/);
    t.match(output4.toString(), /\[write\].+welcome\.html\.tmpl/);
    t.same(await dir2.child('views', 'example', 'welcome.html.tmpl').exists(), true);
    t.match(await dir2.child('views', 'example', 'welcome.html.tmpl').readFile('utf8'), /This page/);
    t.match(output4.toString(), /\[write\].+test.+example\.js/);
    t.same(await dir2.child('test', 'example.js').exists(), true);
    t.match(await dir2.child('test', 'example.js').readFile('utf8'), /getOk/);
    t.match(output4.toString(), /\[write\].+tsconfig\.json/);
    t.same(await dir2.child('tsconfig.json').exists(), true);
    const tsConfig = JSON.parse(await dir2.child('tsconfig.json').readFile('utf8'));
    t.equal(tsConfig.compilerOptions.target, 'ES2020');
    t.same(tsConfig.include, ['src/**/*']);
    t.match(output4.toString(), /\[fixed\].+package\.json/);
    t.same(await dir2.child('package.json').exists(), true);
    const pkg2 = JSON.parse(await dir2.child('package.json').readFile('utf8'));
    t.equal(pkg2.type, 'module');
    t.equal(typeof pkg2.scripts.build, 'string');
    t.equal(typeof pkg2.scripts['build:test'], 'string');
    t.equal(typeof pkg2.scripts['build:watch'], 'string');
    t.equal(typeof pkg2.scripts.dev, 'string');
    t.match(pkg2.scripts.dev, /nodemon lib\/index\.js/);
    t.equal(typeof pkg2.scripts.start, 'string');
    t.match(pkg2.scripts.start, /node lib\/index\.js/);
    t.equal(typeof pkg2.scripts.test, 'string');
    t.match(pkg2.scripts.test, /node --test/);
    t.equal(typeof pkg2.devDependencies['@types/node'], 'string');
    t.equal(typeof pkg2.devDependencies['nodemon'], 'string');
    t.equal(typeof pkg2.devDependencies['tap'], 'string');
    t.equal(typeof pkg2.devDependencies['typescript'], 'string');

    process.chdir(cwd);
  });

  await t.test('create-plugin', async t => {
    const dir = await Path.tempDir();

    const output = await captureOutput(async () => {
      await app.cli.start('create-plugin', '-h');
    });
    t.match(output.toString(), /Usage: APPLICATION create-plugin/);
    t.match(app.cli.commands['create-plugin'].description, /Create plugin/);
    t.match(app.cli.commands['create-plugin'].usage, /Usage: APPLICATION create-plugin/);

    const cwd = process.cwd();
    process.chdir(dir.toString());
    const output2 = await captureOutput(async () => {
      await app.cli.start('create-plugin');
    });
    t.match(output2.toString(), /\[write\].+lib.+mojo-plugin-myplugin\.js/);
    t.same(await dir.child('lib', 'mojo-plugin-myplugin.js').exists(), true);
    t.match(
      await dir.child('lib', 'mojo-plugin-myplugin.js').readFile('utf8'),
      /export default.+Add plugin code here/s
    );
    t.match(output2.toString(), /\[write\].+test.+basic\.js/);
    t.same(await dir.child('test', 'basic.js').exists(), true);
    t.match(await dir.child('test', 'basic.js').readFile('utf8'), /import mojo/);
    t.match(output2.toString(), /\[write\].+README\.md/);
    t.same(await dir.child('README.md').exists(), true);
    t.match(await dir.child('README.md').readFile('utf8'), /npm install mojo-plugin-myplugin/);
    t.match(output2.toString(), /\[fixed\].+package\.json/);
    t.same(await dir.child('package.json').exists(), true);
    t.match(await dir.child('package.json').readFile('utf8'), /module/);

    const output3 = await captureOutput(async () => {
      await app.cli.start('create-plugin');
    });
    t.match(output3.toString(), /\[exists\].+lib.+mojo-plugin-myplugin\.js/);
    t.match(output3.toString(), /\[exists\].+test.+basic\.js/);
    t.match(output3.toString(), /\[exists\].+README\.md/);
    t.match(output3.toString(), /\[fixed\].+package\.json/);

    const dir2 = dir.child('test-plugin');
    await dir2.mkdir();
    process.chdir(dir2.toString());
    const output4 = await captureOutput(async () => {
      await app.cli.start('create-plugin', 'mojo-plugin-test-helpers');
    });
    t.match(output4.toString(), /\[write\].+lib.+mojo-plugin-test-helpers\.js/);
    t.same(await dir2.child('lib', 'mojo-plugin-test-helpers.js').exists(), true);
    t.match(await dir2.child('lib', 'mojo-plugin-test-helpers.js').readFile('utf8'), /export default/);
    t.match(output4.toString(), /\[write\].+README\.md/);
    t.same(await dir2.child('README.md').exists(), true);
    t.match(await dir2.child('README.md').readFile('utf8'), /npm install mojo-plugin-test-helpers/);

    const dir3 = dir.child('ts-plugin');
    await dir3.mkdir();
    process.chdir(dir3.toString());
    const output5 = await captureOutput(async () => {
      await app.cli.start('create-plugin', '--ts');
    });
    t.match(output5.toString(), /\[write\].+src.+mojo-plugin-myplugin\.ts/);
    t.same(await dir3.child('src', 'mojo-plugin-myplugin.ts').exists(), true);
    t.match(
      await dir3.child('src', 'mojo-plugin-myplugin.ts').readFile('utf8'),
      /export default.+app: MojoApp.+Add plugin code here/s
    );
    t.match(output5.toString(), /\[write\].+test.+basic\.js/);
    t.same(await dir3.child('test', 'basic.js').exists(), true);
    t.match(await dir3.child('test', 'basic.js').readFile('utf8'), /import mojo/);
    t.match(output5.toString(), /\[write\].+README\.md/);
    t.same(await dir3.child('README.md').exists(), true);
    t.match(await dir3.child('README.md').readFile('utf8'), /npm install mojo-plugin-myplugin/);
    t.match(output5.toString(), /\[fixed\].+package\.json/);
    t.same(await dir3.child('package.json').exists(), true);
    t.match(await dir3.child('package.json').readFile('utf8'), /module/);

    process.chdir(cwd);
  });
});
