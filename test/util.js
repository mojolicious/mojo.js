'use strict';

const t = require('tap');
const {mojo, File} = require('..');

t.test('escapeRegExp', t => {
  const escapeRegExp = mojo.util.escapeRegExp;
  t.equal(escapeRegExp('te*s?t'), 'te\\*s\\?t', 'escaped');
  t.equal(escapeRegExp('\\^$.*+?()[]{}|'), '\\\\\\^\\$\\.\\*\\+\\?\\(\\)\\[\\]\\{\\}\\|', 'escaped');
  t.done();
});

t.test('sleep', async t => {
  const sleep = mojo.util.sleep(1);
  t.ok(sleep instanceof Promise, 'promise');
  t.same(await sleep, undefined, 'no result');
  t.done();
});

t.test('tablify', t => {
  const tablify = mojo.util.tablify;
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

t.test('tempdir', async t => {
  const tempdir = await mojo.util.tempdir();
  const dir = new File(tempdir.toString());
  t.same(await dir.exists(), true, 'directory exists');
  t.same(await tempdir.exists(), true, 'directory exists');
  await dir.child('test.txt').writeFile('Hello Mojo!');
  t.same(await dir.child('test.txt').exists(), true, 'file exists');
  t.equal((await dir.child('test.txt').readFile()).toString('utf8'), 'Hello Mojo!', 'right content');
  await tempdir.destroy();
  t.same(await dir.exists(), false, 'directory has been removed');
  t.same(await tempdir.exists(), false, 'directory has been removed');
});
