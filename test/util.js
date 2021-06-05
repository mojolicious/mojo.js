'use strict';

const File = require('../lib/file');
const t = require('tap');
const util = require('../lib/util');

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
    });
    t.match(output.toString(), /\[mkdir\].+bar/);
    t.match(output.toString(), /\[write\].+yada\.txt/);
    t.match(output.toString(), /\[chmod\].+yada\.txt \(744\)/);
    t.same(await dir.child('foo', 'bar', 'yada.txt').exists(), true);
    t.match(await dir.child('foo', 'bar', 'yada.txt').readFile('utf8'), /it works/);

    process.chdir(cwd);
  });

  t.test('decodeURIComponentSafe', t => {
    const decode = util.decodeURIComponentSafe;
    t.same(decode('%E0%A4%A'), null);
    t.same(decode('te%2fst'), 'te/st');
    t.same(decode('te%2Fst'), 'te/st');
    t.end();
  });

  t.test('escapeRegExp', t => {
    const escapeRegExp = util.escapeRegExp;
    t.equal(escapeRegExp('te*s?t'), 'te\\*s\\?t', 'escaped');
    t.equal(escapeRegExp('\\^$.*+?()[]{}|'), '\\\\\\^\\$\\.\\*\\+\\?\\(\\)\\[\\]\\{\\}\\|', 'escaped');
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
      line: 70,
      column: 13,
      source: [
        {
          num: 68,
          code: '    let result;'
        },
        {
          num: 69,
          code: '    try {'
        },
        {
          num: 70,
          code: "      throw new Error('Test');"
        },
        {
          num: 71,
          code: '    } catch (error) {'
        },
        {
          num: 72,
          code: '      result = error;'
        }
      ]
    });
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
