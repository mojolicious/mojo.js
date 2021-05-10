import File from '../lib/file.js';
import fs from 'fs/promises';
import path from 'path';
import t from 'tap';
import url from 'url';

t.test('Constructor', t => {
  t.equal(new File().toString(), process.cwd());
  t.equal(new File('foo', 'bar', 'baz').toString(), path.join('foo', 'bar', 'baz'));
  t.equal(new File('foo', 'bar').sibling('baz').toString(), path.join('foo', 'baz'));
  t.equal('' + new File('foo', 'bar', 'baz'), path.join('foo', 'bar', 'baz'));
  t.same(new File('foo', 'bar', 'baz').toArray(), path.join('foo', 'bar', 'baz').split(path.sep));
  t.same(new File('foo', 'bar.txt').toFileURL(), url.pathToFileURL(path.join('foo', 'bar', 'baz')));
  t.end();
});

t.test('basename', t => {
  t.equal(new File('foo', 'bar', 'file.t').basename(), 'file.t');
  t.equal(new File('foo', 'bar', 'file.t').basename('.t'), 'file');
  t.end();
});

t.test('dirname', t => {
  const dirname = path.dirname(path.join('foo', 'bar', 'file.t'));
  t.equal(new File('foo', 'bar', 'file.t').dirname().toString(), dirname);
  t.end();
});

t.test('extname', t => {
  t.equal(new File('foo', 'bar', 'file.t').extname(), '.t');
  t.equal(new File('file.html.ejs').extname(), '.ejs');
  t.end();
});

t.test('realpath', async t => {
  t.equal((await new File('.').realpath()).toString(), await fs.realpath('.'));
});

t.test('I/O', async t => {
  const dir = await File.tempDir();
  t.ok(dir);
  t.ok(await dir.stat());
  t.same(await dir.child('test.txt').exists(), false);
  await dir.child('test.txt').writeFile('Hello Mojo!');
  t.same(await dir.child('test.txt').exists(), true);
  t.same(await dir.child('test.txt').isReadable(), true);
  t.ok(await dir.child('test.txt').stat());
  t.equal((await dir.child('test.txt').readFile()).toString(), 'Hello Mojo!');
  t.equal(dir.child('test.txt').readFileSync().toString(), 'Hello Mojo!');
  t.equal((await dir.child('test.txt').readFile('utf8')), 'Hello Mojo!');
  await dir.child('test.txt').rm();
  t.same(await dir.child('test.txt').exists(), false);
  t.same(await dir.child('test.txt').isReadable(), false);
});

t.test('I/O streams', async t => {
  const dir = await File.tempDir();
  const write = dir.child('test.txt').createWriteStream({encoding: 'utf8'});
  await new Promise(resolve => write.write('Hello World!', resolve));
  const read = dir.child('test.txt').createReadStream({encoding: 'utf8'});
  let str = '';
  read.on('data', chunk => { str = str + chunk; });
  await new Promise(resolve => read.on('end', resolve));
  t.equal(str, 'Hello World!');
});

t.test('touch', async t => {
  const dir = await File.tempDir();
  const file = dir.child('test.txt');
  t.notOk(await file.exists());
  t.ok(await (await file.touch()).exists());
  const future = new Date();
  future.setDate(future.getDate() + 10);
  await fs.utimes(file.toString(), future, future);
  t.not((await (await file.touch()).stat()).mtimeMs, future.getTime());
});

t.test('list', async t => {
  const dir = await File.tempDir();
  const foo = dir.child('foo');
  const bar = foo.child('bar');
  await bar.mkdir({recursive: true});
  await bar.child('one.txt').writeFile('First');
  await foo.child('two.txt').writeFile('Second');
  await foo.child('.three.txt').writeFile('Third');
  t.ok((await dir.child('foo').stat()).isDirectory());
  t.ok((await dir.child('foo', 'bar').stat()).isDirectory());
  t.notOk((await dir.child('foo', 'bar', 'one.txt').stat()).isDirectory());

  const recursive = [];
  for await (const file of dir.list({recursive: true})) {
    recursive.push(file.toString());
  }
  t.same(recursive.sort(), [bar.child('one.txt').toString(), foo.child('two.txt').toString()]);
  t.same(dir.relative(recursive.sort()[0]).toArray(), ['foo', 'bar', 'one.txt']);

  const nonRecursive = [];
  for await (const file of foo.list()) {
    nonRecursive.push(file.toString());
  }
  t.same(nonRecursive.sort(), [foo.child('two.txt').toString()]);

  const nonRecursiveDir = [];
  for await (const file of foo.list({dir: true, hidden: true})) {
    nonRecursiveDir.push(file.toString());
  }
  const expected = [foo.child('.three.txt').toString(), foo.child('bar').toString(), foo.child('two.txt').toString()];
  t.same(nonRecursiveDir.sort(), expected);

  await bar.rm({recursive: true});
  t.same(await bar.exists(), false);
});

t.test('tempDir', async t => {
  const temp = await File.tempDir();
  const dir = new File(temp.toString());
  t.same(await dir.exists(), true);
  t.same(await temp.exists(), true);
  await dir.child('test.txt').writeFile('Hello Mojo!');
  t.same(await dir.child('test.txt').exists(), true);
  t.equal((await dir.child('test.txt').readFile()).toString(), 'Hello Mojo!');
  await temp.destroy();
  t.same(await dir.exists(), false);
  t.same(await temp.exists(), false);
});
