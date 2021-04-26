import t from 'tap';
import fs from 'fs/promises';
import path from 'path';
import * as util from '../lib/util.js';
import File from '../lib/file.js';

t.test('Constructor', t => {
  t.equal(new File().toString(), process.cwd(), 'same path');
  t.equal(new File('foo', 'bar', 'baz').toString(), path.join('foo', 'bar', 'baz'), 'same path');
  t.equal('' + new File('foo', 'bar', 'baz'), path.join('foo', 'bar', 'baz'), 'same path');
  t.done();
});

t.test('basename', t => {
  t.equal(new File('foo', 'bar', 'file.t').basename(), 'file.t', 'right file');
  t.equal(new File('foo', 'bar', 'file.t').basename('.t'), 'file', 'right name');
  t.done();
});

t.test('dirname', t => {
  const dirname = path.dirname(path.join('foo', 'bar', 'file.t'));
  t.equal(new File('foo', 'bar', 'file.t').dirname().toString(), dirname, 'right directory');
  t.done();
});

t.test('realpath', async t => {
  t.equal((await new File('.').realpath()).toString(), await fs.realpath('.'), 'same path');
});

t.test('I/O', async t => {
  const dir = await util.tempdir();
  t.ok(dir, 'temporary directory');
  t.ok(await dir.stat(), 'directory exists');
  t.same(await dir.child('test.txt').exists(), false, 'file does not exist');
  await dir.child('test.txt').writeFile('Hello Mojo!');
  t.same(await dir.child('test.txt').exists(), true, 'file exists');
  t.same(await dir.child('test.txt').isReadable(), true, 'file is readable');
  t.ok(await dir.child('test.txt').stat(), 'file exists');
  t.equal((await dir.child('test.txt').readFile()).toString('utf8'), 'Hello Mojo!', 'right content');
  t.equal((await dir.child('test.txt').readFile('utf8')), 'Hello Mojo!', 'same result');
  await dir.child('test.txt').rm();
  t.same(await dir.child('test.txt').exists(), false, 'file has been removed');
  t.same(await dir.child('test.txt').isReadable(), false, 'file is not readable');
});

t.test('I/O streams', async t => {
  const dir = await util.tempdir();
  const write = dir.child('test.txt').createWriteStream({encoding: 'utf8'});
  await new Promise(resolve => write.write('Hello World!', resolve));
  const read = dir.child('test.txt').createReadStream({encoding: 'utf8'});
  let str = '';
  read.on('data', chunk => { str = str + chunk; });
  await new Promise(resolve => read.on('end', resolve));
  t.equal(str, 'Hello World!', 'right result');
});

t.test('list', async t => {
  const dir = await util.tempdir();
  const foo = dir.child('foo');
  const bar = foo.child('bar');
  await bar.mkdir({recursive: true});
  await bar.child('one.txt').writeFile('First');
  await foo.child('two.txt').writeFile('Second');
  await foo.child('.three.txt').writeFile('Third');
  t.ok((await dir.child('foo').stat()).isDirectory(), 'directory exists');
  t.ok((await dir.child('foo', 'bar').stat()).isDirectory(), 'directory exists');
  t.notOk((await dir.child('foo', 'bar', 'one.txt').stat()).isDirectory(), 'not a directory');

  const recursive = [];
  for await (const file of dir.list({recursive: true})) {
    recursive.push(file.toString());
  }
  t.same(recursive.sort(), [bar.child('one.txt').toString(), foo.child('two.txt').toString()], 'right structure');

  const nonRecursive = [];
  for await (const file of foo.list()) {
    nonRecursive.push(file.toString());
  }
  t.same(nonRecursive.sort(), [foo.child('two.txt').toString()], 'right structure');

  const nonRecursiveDir = [];
  for await (const file of foo.list({dir: true, hidden: true})) {
    nonRecursiveDir.push(file.toString());
  }
  const expected = [foo.child('.three.txt').toString(), foo.child('bar').toString(), foo.child('two.txt').toString()];
  t.same(nonRecursiveDir.sort(), expected, 'right structure');

  await bar.rm({recursive: true});
  t.same(await bar.exists(), false, 'directory has been removed');
});
