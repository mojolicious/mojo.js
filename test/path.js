import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import url from 'url';
import {Path} from '../lib/path.js';
import t from 'tap';

t.test('Path', async t => {
  t.test('Constructor', t => {
    t.equal(new Path().toString(), process.cwd());
    t.equal(new Path('foo', 'bar', 'baz').toString(), path.join('foo', 'bar', 'baz'));
    t.equal(new Path('foo', 'bar').sibling('baz').toString(), path.join('foo', 'baz'));
    t.equal('' + new Path('foo', 'bar', 'baz'), path.join('foo', 'bar', 'baz'));
    t.same(new Path('foo', 'bar', 'baz').toArray(), path.join('foo', 'bar', 'baz').split(path.sep));
    t.same(new Path('foo', 'bar.txt').toFileURL(), url.pathToFileURL(path.join('foo', 'bar', 'baz')));
    t.end();
  });

  t.test('basename', t => {
    t.equal(new Path('foo', 'bar', 'file.t').basename(), 'file.t');
    t.equal(new Path('foo', 'bar', 'file.t').basename('.t'), 'file');
    t.end();
  });

  t.test('dirname', t => {
    const dirname = path.dirname(path.join('foo', 'bar', 'file.t'));
    t.equal(new Path('foo', 'bar', 'file.t').dirname().toString(), dirname);
    t.end();
  });

  t.test('extname', t => {
    t.equal(new Path('foo', 'bar', 'file.t').extname(), '.t');
    t.equal(new Path('file.html.ejs').extname(), '.ejs');
    t.end();
  });

  t.test('isAbsolute', t => {
    t.same(new Path('file.t').isAbsolute(), false);
    t.same(new Path('/etc/passwd').isAbsolute(), true);
    t.end();
  });

  await t.test('realpath', async t => {
    const realPath = await fsPromises.realpath('.');
    t.equal((await new Path('.').realpath()).toString(), realPath);
    t.equal(new Path('.').realpathSync().toString(), realPath);
  });

  await t.test('I/O', async t => {
    const dir = await Path.tempDir();

    t.ok(dir);
    t.ok(await dir.stat());

    t.same(await dir.child('test.txt').exists(), false);
    t.same(dir.child('test.txt').existsSync(), false);
    await dir.child('test.txt').writeFile('Hello Mojo!');
    t.same(await dir.child('test.txt').exists(), true);
    t.same(dir.child('test.txt').existsSync(), true);
    t.same(await dir.child('test.txt').isReadable(), true);
    t.same(await dir.child('test.txt').access(fs.constants.R_OK), true);
    t.same(dir.child('test.txt').isReadableSync(), true);
    t.same(dir.child('test.txt').accessSync(fs.constants.R_OK), true);
    t.ok(await dir.child('test.txt').stat());

    t.equal((await dir.child('test.txt').readFile()).toString(), 'Hello Mojo!');
    t.equal(dir.child('test.txt').readFileSync().toString(), 'Hello Mojo!');
    t.equal((await dir.child('test.txt').readFile('utf8')), 'Hello Mojo!');

    await dir.child('test.txt').rm();
    t.same(await dir.child('test.txt').exists(), false);
    t.same(await dir.child('test.txt').isReadable(), false);
    t.same(await dir.child('test.txt').access(fs.constants.R_OK), false);
    t.same(dir.child('test.txt').isReadableSync(), false);
    t.same(dir.child('test.txt').accessSync(fs.constants.R_OK), false);

    const baz = dir.child('baz.txt');
    const fh = await baz.open('w');
    await fh.write('Hello ');
    await fh.write('JavaScript!');
    await fh.close();
    t.equal((await baz.readFile('utf8')), 'Hello JavaScript!');
  });

  await t.test('I/O (streams)', async t => {
    const dir = await Path.tempDir();
    const write = dir.child('test.txt').createWriteStream({encoding: 'utf8'});
    await new Promise(resolve => write.write('Hello World!', resolve));
    const read = dir.child('test.txt').createReadStream({encoding: 'utf8'});
    let str = '';
    read.on('data', chunk => { str = str + chunk });
    await new Promise(resolve => read.once('end', resolve));
    t.equal(str, 'Hello World!');
  });

  await t.test('I/O (lines)', async t => {
    const dir = await Path.tempDir();
    const file = dir.child('test.txt');
    await file.writeFile('foo\nbar\nI ♥ Mojolicious\n', {encoding: 'UTF-8'});
    const lines = [];
    for await (const line of file.lines({encoding: 'UTF-8'})) {
      lines.push(line);
    }
    t.same(lines, ['foo', 'bar', 'I ♥ Mojolicious']);
  });

  await t.test('copyFile and rename', async t => {
    const dir = await Path.tempDir();

    const oldFile = await dir.child('test.txt').writeFile('Hello Mojo!');
    t.same(await oldFile.exists(), true);
    const newFile = dir.child('test.new');
    t.same(await newFile.exists(), false);
    t.same((await oldFile.copyFile(newFile)).basename(), 'test.txt');
    t.same(await oldFile.exists(), true);
    t.same(await newFile.exists(), true);

    await oldFile.rm();
    t.same(await oldFile.exists(), false);
    await newFile.rename(oldFile);
    t.same(await oldFile.exists(), true);
    t.same(await newFile.exists(), false);
    t.equal(await oldFile.readFile('utf8'), 'Hello Mojo!');

    oldFile.writeFileSync('Hello Mojo again!');
    t.same(oldFile.existsSync(), true);
    t.same(newFile.existsSync(), false);
    t.same(oldFile.copyFileSync(newFile).basename(), 'test.txt');
    t.same(oldFile.existsSync(), true);
    t.same(newFile.existsSync(), true);

    oldFile.rmSync();
    t.same(oldFile.existsSync(), false);
    newFile.renameSync(oldFile);
    t.same(oldFile.existsSync(), true);
    t.same(newFile.existsSync(), false);
    t.equal(oldFile.readFileSync('utf8'), 'Hello Mojo again!');
  });

  await t.test('touch', async t => {
    const dir = await Path.tempDir();
    const file = dir.child('test.txt');
    t.notOk(await file.exists());
    t.ok(await (await file.touch()).exists());
    const future = new Date();
    future.setDate(future.getDate() + 10);
    await file.utimes(future, future);
    t.not((await (await file.touch()).stat()).mtimeMs, future.getTime());

    const dir2 = Path.tempDirSync();
    const file2 = dir2.child('test.txt');
    t.notOk(file2.existsSync());
    t.ok(file2.touchSync().existsSync());
    const future2 = new Date();
    future2.setDate(future2.getDate() + 10);
    t.not(file2.utimesSync(future2, future2).touchSync().statSync().mtimeMs, future2.getTime());
  });

  await t.test('mkdir', async t => {
    const dir = await Path.tempDir();
    const foo = dir.child('foo');
    const bar = foo.child('bar');
    await bar.mkdir({recursive: true});
    t.ok(await bar.exists(), true);
    t.ok(await foo.exists(), true);

    const dir2 = Path.tempDirSync();
    const foo2 = dir2.child('foo');
    const bar2 = foo2.child('bar');
    t.ok(bar2.mkdirSync({recursive: true}).existsSync(), true);
    t.ok(foo.existsSync(), true);
  });

  await t.test('list', async t => {
    const dir = await Path.tempDir();

    const foo = dir.child('foo');
    const bar = foo.child('bar');
    await bar.mkdir({recursive: true});
    await bar.child('one.txt').writeFile('First');
    await foo.child('two.txt').writeFile('Second');
    await foo.child('.three.txt').writeFile('Third');
    t.ok((await dir.child('foo').stat()).isDirectory());
    t.ok(dir.child('foo').statSync().isDirectory());
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

  await t.test('symlink', async t => {
    const dir = await Path.tempDir();

    const link = dir.child('test-link');
    const orig = await link.sibling('test').mkdir().then(orig => orig.symlink(link));
    t.same((await link.stat()).isDirectory(), true);
    t.same((await link.lstat()).isDirectory(), false);
    t.same((await orig.stat()).isDirectory(), true);
    t.same((await orig.lstat()).isDirectory(), true);

    const link2 = dir.child('test-link2');
    const orig2 = link2.sibling('test2').mkdirSync().symlinkSync(link2);
    t.same(link2.statSync().isDirectory(), true);
    t.same(link2.lstatSync().isDirectory(), false);
    t.same(orig2.statSync().isDirectory(), true);
    t.same(orig2.lstatSync().isDirectory(), true);
  });

  await t.test('tempDir', async t => {
    const temp = await Path.tempDir();
    const dir = new Path(temp.toString());
    t.same(await dir.exists(), true);
    t.same(await temp.exists(), true);
    await dir.child('test.txt').writeFile('Hello Mojo!');
    t.same(await dir.child('test.txt').exists(), true);
    t.equal((await dir.child('test.txt').readFile()).toString(), 'Hello Mojo!');
    await temp.destroy();
    t.same(await dir.exists(), false);
    t.same(await temp.exists(), false);

    const temp2 = Path.tempDirSync();
    const dir2 = new Path(temp2.toString());
    t.same(dir2.existsSync(), true);
    t.same(temp2.existsSync(), true);
    dir2.child('test.txt').writeFileSync('Hello Mojo!');
    t.same(dir2.child('test.txt').existsSync(), true);
    t.equal(dir2.child('test.txt').readFileSync().toString(), 'Hello Mojo!');
    temp2.destroySync();
    t.same(dir2.existsSync(), false);
    t.same(temp2.existsSync(), false);
  });
});
