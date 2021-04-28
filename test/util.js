import t from 'tap';
import * as util from '../lib/util.js';

t.test('sleep', async t => {
  const sleep = util.sleep(1);
  t.ok(sleep instanceof Promise, 'promise');
  t.same(await sleep, undefined, 'no result');
  t.done();
});

t.test('tablify', t => {
  const tablify = util.tablify;
  t.equal(typeof tablify, 'function', 'is a function');
  t.equal(tablify([['foo']]), 'foo\n', 'right format');
  t.equal(tablify([['f\r\no o\r\n', 'bar']]), 'fo o  bar\n', 'right format');
  t.equal(tablify([['  foo', '  b a r']]), '  foo    b a r\n', 'right format');
  t.equal(tablify([['foo', 'yada'], ['yada', 'yada']]), 'foo   yada\nyada  yada\n', 'right format');
  t.equal(tablify([[undefined, 'yada'], ['yada', null]]), '      yada\nyada  \n', 'missing values expanded');
  t.equal(tablify([['foo', 'bar', 'baz'], ['yada', 'yada', 'yada']]), 'foo   bar   baz\nyada  yada  yada\n',
    'right format');
  t.equal(tablify([['a', '', 0], [0, '', 'b']]), 'a    0\n0    b\n', 'empty values expanded');
  t.equal(tablify([[1, 2], [3]]), '1  2\n3\n', 'right format');
  t.equal(tablify([[1], [2, 3]]), '1\n2  3\n', 'right format');
  t.equal(tablify([[1], [], [2, 3]]), '1\n\n2  3\n', 'missing values expanded');
  t.done();
});
