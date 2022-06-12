import {util} from '../lib/core.js';
import Path from '@mojojs/path';
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

    const output3 = await util.captureOutput(
      async () => {
        process.stdout.write('works');
        process.stderr.write('too');
      },
      {stderr: true}
    );
    t.match(output3, /workstoo/);
  });

  await t.test('cli*', async t => {
    const dir = await Path.tempDir();
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

    const dir2 = await Path.tempDir();
    process.chdir(dir2.toString());
    const output2 = await util.captureOutput(async () => {
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

    const output = await util.captureOutput(async () => {
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
    const output2 = await util.captureOutput(async () => {
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
    const line = 132;
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

  t.test('jsonPointer (RFC 6901)', t => {
    const jsonPointer = util.jsonPointer;

    t.equal(jsonPointer({hello: 'world'}, '/hello'), 'world', 'right result');
    t.same(jsonPointer({hello: 'world'}, '/bye'), undefined, 'no result');
    t.same(jsonPointer({hello: 'world'}, '/'), undefined, 'no result');
    t.same(jsonPointer({hello: 'world'}, '/0'), undefined, 'no result');
    t.same(jsonPointer({hello: null}, '/hello'), null, 'right result');

    t.same(jsonPointer([], '/0'), undefined, 'no result');
    t.same(jsonPointer(['test', 123], '/0'), 'test', 'right result');
    t.same(jsonPointer(['test', 123], '/1'), 123, 'right result');
    t.same(jsonPointer('test', ''), 'test', 'right result');
    t.same(jsonPointer('', '/0'), undefined, 'no result');

    const value = {
      foo: ['bar', 'baz'],
      '': 0,
      'a/b': 1,
      'c%d': 2,
      'e^f': 3,
      'g|h': 4,
      'i\\j': 5,
      'k"l': 6,
      ' ': 7,
      'm~n': 8
    };
    t.same(jsonPointer(value, ''), value, 'empty pointer is whole document');
    t.same(jsonPointer(value, '/foo'), ['bar', 'baz'], '"/foo" is "["bar", "baz"]"');
    t.same(jsonPointer(value, '/'), 0, '"/" is 0');
    t.same(jsonPointer(value, '/a~1b'), 1, '"/a~1b" is 1');
    t.same(jsonPointer(value, '/c%d'), 2, '"/c%d" is 2');
    t.same(jsonPointer(value, '/e^f'), 3, '"/e^f" is 3');
    t.same(jsonPointer(value, '/g|h'), 4, '"/g|h" is 4');
    t.same(jsonPointer(value, '/i\\j'), 5, '"/i\\j" is 5');
    t.same(jsonPointer(value, '/k"l'), 6, '"/k"l" is 6');
    t.same(jsonPointer(value, '/ '), 7, '"/ " is 7');
    t.same(jsonPointer(value, '/m~0n'), 8, '"/m~0n" is 8');
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

  t.test('tablify', t => {
    const tablify = util.tablify;
    t.equal(typeof tablify, 'function');
    t.equal(tablify([['foo']]), 'foo\n');
    t.equal(tablify([['f\r\no o\r\n', 'bar']]), 'fo o  bar\n');
    t.equal(tablify([['  foo', '  b a r']]), '  foo    b a r\n');
    t.equal(
      tablify([
        ['foo', 'yada'],
        ['yada', 'yada']
      ]),
      'foo   yada\nyada  yada\n'
    );
    t.equal(
      tablify([
        [undefined, 'yada'],
        ['yada', null]
      ]),
      '      yada\nyada  \n'
    );
    t.equal(
      tablify([
        ['foo', 'bar', 'baz'],
        ['yada', 'yada', 'yada']
      ]),
      'foo   bar   baz\nyada  yada  yada\n'
    );
    t.equal(
      tablify([
        ['a', '', 0],
        [0, '', 'b']
      ]),
      'a    0\n0    b\n'
    );
    t.equal(tablify([[1, 2], [3]]), '1  2\n3\n');
    t.equal(tablify([[1], [2, 3]]), '1\n2  3\n');
    t.equal(tablify([[1], [], [2, 3]]), '1\n\n2  3\n');
    t.end();
  });

  t.test('termEscape', t => {
    const termEscape = util.termEscape;
    t.equal(typeof termEscape, 'function');
    t.equal(termEscape('Accept: */*\x0d\x0a'), 'Accept: */*\\x0d\x0a');
    t.equal(termEscape('\t\b\r\n\f'), '\\x09\\x08\\x0d\n\\x0c');
    t.equal(termEscape('\x00\x09\x0b\x1f\x7f\x80\x9f'), '\\x00\\x09\\x0b\\x1f\\x7f\\x80\\x9f');
    t.end();
  });
});
