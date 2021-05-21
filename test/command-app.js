import {app} from './support/command-app/index.js';
import {captureOutput} from '../lib/util.js';
import File from '../lib/file.js';
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

  await t.test('Custom command', async t => {
    t.equal(await app.cli.start('test', 'works'), 'Test works!');
    t.equal(app.cli.commands.test.description, 'Test description');
    t.equal(app.cli.commands.test.usage, 'Test usage');
  });

  await t.test('eval', async t => {
    const output = await captureOutput(async () => {
      await app.cli.start('eval', '100 + 924');
    });
    t.match(output, /1024/);
    t.match(app.cli.commands.eval.description, /Run code against application/);
    t.match(app.cli.commands.eval.usage, /Usage: APPLICATION eval/);

    let output2, error;
    try {
      output2 = await captureOutput(async () => {
        await app.cli.start('eval', 'throw new Error("test error")');
      });
    } catch (err) {
      error = err;
    }
    t.same(output2, undefined);
    t.match(error, /test error/);
  });

  await t.test('get', async t => {
    const output = await captureOutput(async () => {
      await app.cli.start('get', '/');
    });
    t.match(output.toString(), /Hello Mojo!/);
    t.match(app.cli.commands.get.description, /Perform HTTP request/);
    t.match(app.cli.commands.get.usage, /Usage: APPLICATION get/);

    const output2 = await captureOutput({stderr: true}, async () => {
      await app.cli.start('get', '-v', '/');
    });
    t.match(output2.toString(), /GET.*Host.*Content-Length.*Hello Mojo!/s);

    const output3 = await captureOutput({stderr: true}, async () => {
      await app.cli.start('get', '-H', 'Accept: application/json', '-v', '/');
    });
    t.match(output3.toString(), /GET.*Accept.*Content-Length.*Hello Mojo!/s);

    const output4 = await captureOutput({stderr: true}, async () => {
      await app.cli.start('get', '-b', 'works', '-v', '/');
    });
    t.match(output4.toString(), /GET.*Content-Length.*Content-Length.*Hello Mojo!/s);

    const output5 = await captureOutput({stderr: true}, async () => {
      await app.cli.start('get', '-r', '-X', 'POST', '-v', '/redirect');
    });
    t.match(output5.toString(), /GET.*\/.*Content-Length.*Hello Mojo!/s);
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
  });

  await t.test('version', async t => {
    const output = await captureOutput(async () => {
      await app.cli.start('version');
    });
    t.match(output, /mojo\.js\s+\(\d\.\d\.\d(?:-(?:alpha|beta)\.\d+)?\)/);
    t.match(app.cli.commands.version.description, /Show version/);
    t.match(app.cli.commands.version.usage, /Usage: APPLICATION version/);
  });

  await t.test('gen-lite-app', async t => {
    const dir = await File.tempDir();

    const output = await captureOutput(async () => {
      await app.cli.start('gen-lite-app', '-h');
    });
    t.match(output.toString(), /Usage: APPLICATION gen-lite-app/);
    t.match(app.cli.commands['gen-lite-app'].description, /Generate single file application/);
    t.match(app.cli.commands['gen-lite-app'].usage, /Usage: APPLICATION gen-lite-app/);

    const cwd = process.cwd();
    process.chdir(dir.toString());
    const file = dir.child('myapp.js');
    const output2 = await captureOutput(async () => {
      await app.cli.start('gen-lite-app', 'myapp.js');
    });
    t.match(output2.toString(), /\[write\].+myapp\.js/);
    t.same(await file.exists(), true);
    t.match(await file.readFile('utf8'), /import mojo from '@mojojs\/mojo'/);

    const output3 = await captureOutput(async () => {
      await app.cli.start('gen-lite-app', 'myapp.js');
    });
    t.match(output3.toString(), /\[exist\].+myapp\.js/);

    const file2 = dir.child('index.js');
    const output4 = await captureOutput(async () => {
      await app.cli.start('gen-lite-app');
    });
    t.match(output4.toString(), /\[write\].+index\.js/);
    t.same(await file2.exists(), true);
    t.match(await file2.readFile('utf8'), /import mojo from '@mojojs\/mojo'/);
    process.chdir(cwd);
  });

  await t.test('gen-full-app', async t => {
    const dir = await File.tempDir();

    const output = await captureOutput(async () => {
      await app.cli.start('gen-full-app', '-h');
    });
    t.match(output.toString(), /Usage: APPLICATION gen-full-app/);
    t.match(app.cli.commands['gen-full-app'].description, /Generate application directory structure/);
    t.match(app.cli.commands['gen-full-app'].usage, /Usage: APPLICATION gen-full-app/);

    const cwd = process.cwd();
    process.chdir(dir.toString());
    const output2 = await captureOutput(async () => {
      await app.cli.start('gen-full-app');
    });
    t.match(output2.toString(), /\[write\].+config\.json/);
    t.same(await dir.child('config.json').exists(), true);
    t.match(await dir.child('config.json').readFile('utf8'), /"secrets"/);
    t.match(output2.toString(), /\[write\].+index\.js/);
    t.same(await dir.child('index.js').exists(), true);
    t.match(await dir.child('index.js').readFile('utf8'), /import mojo.+from '@mojojs\/mojo'/);
    t.match(output2.toString(), /\[write\].+controllers.+example\.js/);
    t.same(await dir.child('controllers', 'example.js').exists(), true);
    t.match(await dir.child('controllers', 'example.js').readFile('utf8'), /export class Controller/);
    t.match(output2.toString(), /\[write\].+default\.html\.ejs/);
    t.same(await dir.child('views', 'layouts', 'default.html.ejs').exists(), true);
    t.match(await dir.child('views', 'layouts', 'default.html.ejs').readFile('utf8'), /Welcome/);
    t.match(output2.toString(), /\[write\].+welcome\.html\.ejs/);
    t.same(await dir.child('views', 'example', 'welcome.html.ejs').exists(), true);
    t.match(await dir.child('views', 'example', 'welcome.html.ejs').readFile('utf8'), /This page/);
    t.match(output2.toString(), /\[write\].+test.+example\.js/);
    t.same(await dir.child('test', 'example.js').exists(), true);
    t.match(await dir.child('test', 'example.js').readFile('utf8'), /getOk/);

    const output3 = await captureOutput(async () => {
      await app.cli.start('gen-full-app');
    });
    t.match(output3.toString(), /\[exist\].+config\.json/);
    t.match(output3.toString(), /\[exist\].+index\.js/);
    t.match(output3.toString(), /\[exist\].+controllers.+example\.js/);
    t.match(output3.toString(), /\[exist\].+default\.html\.ejs/);
    t.match(output3.toString(), /\[exist\].+welcome\.html\.ejs/);
    t.match(output3.toString(), /\[exist\].+test.+example\.js/);

    const dir2 = dir.child('test-app');
    await dir2.mkdir();
    process.chdir(dir2.toString());
    const output4 = await captureOutput(async () => {
      await app.cli.start('gen-full-app', 'myapp.js');
    });
    t.match(output4.toString(), /\[write\].+test-app.+myapp\.js/);
    t.same(await dir2.child('myapp.js').exists(), true);
    t.match(await dir2.child('myapp.js').readFile('utf8'), /import mojo.+from '@mojojs\/mojo'/);
    process.chdir(cwd);
  });
});
