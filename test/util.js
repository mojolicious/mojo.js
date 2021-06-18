
import File from '../lib/file.js';
import * as util from '../lib/util.js';

import t from 'tap';

t.test('Util', async t => {
  await t.test('captureOutput', async t => {
    const output = await util.captureOutput(async () => {
      console.log('test works');
    });
    t.match(output, /test works/);

    let output2, error;
    try {
      output2 = await util.captureOutput(async () => {
        throw new Error('Capture error');
      });
    } catch (err) {
      error = err;
    }
    t.same(output2, undefined);
    t.match(error, /Capture error/);

    const output3 = await util.captureOutput({stderr: true}, async () => {
      process.stdout.write('works');
      process.stderr.write('too');
    });
    t.match(output3, /workstoo/);
  });

  await t.test('cli*', async t => {
    const dir = await File.tempDir();
    const cwd = process.cwd();
    process.chdir(dir.toString());

    const output = await util.captureOutput(async () => {
      await dir.child('package.json').writeFile('{"name": "test"}');
      await util.cliCreateDir('foo/bar');
      await util.cliCreateFile('foo/bar/yada.txt', 'it <%= test %>', {test: 'works'}, {chmod: 0o744});
      await util.cliFixPackage();
    });
    t.match(output.toString(), /\[mkdir\].+bar/);
    t.match(output.toString(), /\[write\].+yada\.txt/);
    t.match(output.toString(), /\[chmod\].+yada\.txt \(744\)/);
    t.match(output.toString(), /\[fixed\].+package\.json/);
    t.same(await dir.child('foo', 'bar', 'yada.txt').exists(), true);
    t.match(await dir.child('foo', 'bar', 'yada.txt').readFile('utf8'), /it works/);
    t.same(JSON.parse(await dir.child('package.json').readFile('utf8')), {name: 'test', type: 'module'});

    const dir2 = await File.tempDir();
    process.chdir(dir2.toString());
    const output2 = await util.captureOutput(async () => {
      await util.cliFixPackage();
      await util.cliFixPackage();
    });
    t.match(output2.toString(), /\[write\].+package\.json/);
    t.match(output2.toString(), /\[exists\].+package\.json/);
    t.same(JSON.parse(await dir2.child('package.json').readFile('utf8')), {type: 'module'});

    process.chdir(cwd);
  });

  t.test('decodeURIComponentSafe', t => {
    const decode = util.decodeURIComponentSafe;
    t.same(decode('%E0%A4%A'), null);
    t.same(decode('te%2fst'), 'te/st');
    t.same(decode('te%2Fst'), 'te/st');
    t.end();
  });

  await t.test('exceptionContext', async t => {
    const exceptionContext = util.exceptionContext;
    let result;
    try {
      throw new Error('Test');
    } catch (error) {
      result = error;
    }
    t.same(await exceptionContext(result, {lines: 2}), {
      file: File.currentFile().toString(),
      line: 76,
      column: 13,
      source: [
        {
          num: 74,
          code: '    let result;'
        },
        {
          num: 75,
          code: '    try {'
        },
        {
          num: 76,
          code: "      throw new Error('Test');"
        },
        {
          num: 77,
          code: '    } catch (error) {'
        },
        {
          num: 78,
          code: '      result = error;'
        }
      ]
    });
  });

  await t.test('loadModules', async t => {
    const loadModules = util.loadModules;
    const modules = await loadModules([File.currentFile().sibling('support', 'full-app', 'controllers').toString()]);
    t.ok(modules.foo != null);
    t.ok(modules.bar != null);
    t.ok(modules['foo/baz'] != null);
    t.ok(modules.yada === null);
    t.ok(modules['foo/bar'] === undefined);
    t.ok(modules.baz === undefined);
  });

  await t.test('sleep', async t => {
    const sleep = util.sleep(1);
    t.ok(sleep instanceof Promise);
    t.same(await sleep, undefined);
  });

  t.test('tablify', t => {
    const tablify = util.tablify;
    t.equal(typeof tablify, 'function');
    t.equal(tablify([['foo']]), 'foo\n');
    t.equal(tablify([['f\r\no o\r\n', 'bar']]), 'fo o  bar\n');
    t.equal(tablify([['  foo', '  b a r']]), '  foo    b a r\n');
    t.equal(tablify([['foo', 'yada'], ['yada', 'yada']]), 'foo   yada\nyada  yada\n');
    t.equal(tablify([[undefined, 'yada'], ['yada', null]]), '      yada\nyada  \n');
    t.equal(tablify([['foo', 'bar', 'baz'], ['yada', 'yada', 'yada']]), 'foo   bar   baz\nyada  yada  yada\n');
    t.equal(tablify([['a', '', 0], [0, '', 'b']]), 'a    0\n0    b\n');
    t.equal(tablify([[1, 2], [3]]), '1  2\n3\n');
    t.equal(tablify([[1], [2, 3]]), '1\n2  3\n');
    t.equal(tablify([[1], [], [2, 3]]), '1\n\n2  3\n');
    t.end();
  });
});
