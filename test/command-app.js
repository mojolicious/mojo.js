import {app} from './support/command-app/index.js';
import {captureOutput} from '../lib/util.js';
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
});
