import File from '../lib/file.js';
import t from 'tap';
import * as util from '../lib/util.js';

t.test('captureOutput', async t => {
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

t.test('decodeURIComponentSafe', async t => {
  const decode = util.decodeURIComponentSafe;
  t.same(decode('%E0%A4%A'), null);
  t.same(decode('te%2fst'), 'te/st');
  t.same(decode('te%2Fst'), 'te/st');
  t.end();
});

t.test('exceptionContext', async t => {
  const exceptionContext = util.exceptionContext;
  let result;
  try {
    throw new Error('Test');
  } catch (error) {
    result = error;
  }
  t.same(await exceptionContext(result, {lines: 2}), {
    file: File.currentFile().toString(),
    line: 41,
    column: 11,
    source: [
      {
        line: 39,
        code: '  let result;'
      },
      {
        line: 40,
        code: '  try {'
      },
      {
        line: 41,
        code: "    throw new Error('Test');"
      },
      {
        line: 42,
        code: '  } catch (error) {'
      },
      {
        line: 43,
        code: '    result = error;'
      }
    ]
  });
  t.end();
});

t.test('sleep', async t => {
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
