import {util} from '../lib/core.js';
import Path from '@mojojs/path';
import {captureOutput} from '@mojojs/util';
import t from 'tap';

t.test('Util', async t => {
  await t.test('cli*', async t => {
    const dir = await Path.tempDir();
    const cwd = process.cwd();
    process.chdir(dir.toString());

    const output = await captureOutput(async () => {
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

    const dir2 = await Path.tempDir();
    process.chdir(dir2.toString());
    const output2 = await captureOutput(async () => {
      await util.cliFixPackage();
      await util.cliFixPackage();
    });
    t.match(output2.toString(), /\[fixed\].+package\.json/);
    t.same(JSON.parse(await dir2.child('package.json').readFile('utf8')), {type: 'module'});

    process.chdir(cwd);
  });

  await t.test('cliFixPackage', async t => {
    const cwd = process.cwd();

    const dir = await Path.tempDir();
    process.chdir(dir.toString());
    const pkg = dir.child('package.json');

    const output = await captureOutput(async () => {
      await util.cliFixPackage({
        author: 'Somebody',
        dependencies: {foo: '1.0.0'},
        devDependencies: {bar: '1.0.0'},
        exports: './test.js',
        files: ['lib'],
        license: 'MIT',
        name: 'mojo-test',
        scripts: {test: 'prove test/*.t'},
        version: '0.0.2'
      });
    });
    t.match(output.toString(), /\[fixed\].+package\.json/);
    t.same(JSON.parse(await pkg.readFile('utf8')), {
      author: 'Somebody',
      dependencies: {foo: '1.0.0'},
      devDependencies: {bar: '1.0.0'},
      exports: './test.js',
      files: ['lib'],
      license: 'MIT',
      name: 'mojo-test',
      scripts: {test: 'prove test/*.t'},
      type: 'module',
      version: '0.0.2'
    });

    await pkg.rm();
    await pkg.writeFile('{"name":"yada","dependencies":{"foo":"0.0.1"},"files":["test"]}');
    const output2 = await captureOutput(async () => {
      await util.cliFixPackage({
        author: 'Somebody',
        dependencies: {foo: '2.0.0', bar: '1.0.0'},
        name: 'fail',
        files: ['lib']
      });
    });
    t.match(output2.toString(), /\[fixed\].+package\.json/);
    t.same(JSON.parse(await pkg.readFile('utf8')), {
      author: 'Somebody',
      dependencies: {foo: '0.0.1', bar: '1.0.0'},
      files: ['test', 'lib'],
      name: 'yada',
      type: 'module'
    });

    process.chdir(cwd);
  });

  await t.test('exceptionContext', async t => {
    const exceptionContext = util.exceptionContext;
    let result;
    try {
      throw new Error('Test');
    } catch (error) {
      result = error;
    }
    const line = 98;
    t.same(await exceptionContext(result, {lines: 2}), {
      file: Path.currentFile().toString(),
      line,
      column: 13,
      source: [
        {
          num: line - 2,
          code: '    let result;'
        },
        {
          num: line - 1,
          code: '    try {'
        },
        {
          num: line,
          code: "      throw new Error('Test');"
        },
        {
          num: line + 1,
          code: '    } catch (error) {'
        },
        {
          num: line + 2,
          code: '      result = error;'
        }
      ]
    });
  });

  t.test('httpStatusMessages', t => {
    const messages = util.httpStatusMessages;
    t.same(messages[200], 'OK');
    t.same(messages[404], 'Not Found');
    t.same(messages[418], "I'm a teapot");
    t.same(messages[500], 'Internal Server Error');
    t.end();
  });

  await t.test('loadModules', async t => {
    const loadModules = util.loadModules;
    const modules = await loadModules([
      Path.currentFile().sibling('support', 'js', 'full-app', 'controllers').toString()
    ]);
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
});
