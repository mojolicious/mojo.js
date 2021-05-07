import Pattern from '../lib/router/pattern.js';
import t from 'tap';

t.test('Text pattern', t => {
  const pattern = new Pattern('/test/123');
  t.same(pattern.match('/test/123'), {});
  t.same(pattern.match('/test'), null);
  t.end();
});

t.test('Normal pattern with text, placeholders and a default value', t => {
  const pattern = new Pattern('/test/<controller>/:action', {defaults: {action: 'index'}});
  t.same(pattern.match('/test/foo/bar', {isEndpoint: true}), {controller: 'foo', action: 'bar'});
  t.same(pattern.match('/test/foo'), {controller: 'foo', action: 'index'});
  t.same(pattern.match('/test/foo/'), {controller: 'foo', action: 'index'});
  t.same(pattern.match('/test/'), null);
  t.equal(pattern.render({controller: 'foo'}), '/test/foo');

  const pattern2 = new Pattern().parse('/foo/:bar');
  pattern2.defaults = {...pattern2.defaults, bar: 'baz'};
  t.same(pattern2.match('/foo/bar'), {bar: 'bar'});
  t.same(pattern2.match('/foo'), {bar: 'baz'});
  t.end();
});

t.test('Optional placeholder in the middle', t => {
  const pattern = new Pattern('/test<name>123');
  pattern.defaults = {name: 'foo'};
  t.same(pattern.match('/test123', {isEndpoint: true}), {name: 'foo'});
  t.same(pattern.match('/testbar123', {isEndpoint: true}), {name: 'bar'});
  t.same(pattern.match('/test/123'), null);
  t.equal(pattern.render(), '/testfoo123');
  t.equal(pattern.render({name: 'bar'}), '/testbar123');
  pattern.defaults = {name: ''};
  t.same(pattern.match('/test123', {isEndpoint: true}), {name: ''});
  t.equal(pattern.render(), '/test123');

  const pattern2 = new Pattern('/test/:name/123');
  pattern2.defaults = {name: 'foo'};
  t.same(pattern2.match('/test/123', {isEndpoint: true}), {name: 'foo'});
  t.same(pattern2.match('/test/bar/123', {isEndpoint: true}), {name: 'bar'});
  t.same(pattern2.match('/test'), null);
  t.equal(pattern2.render(), '/test/foo/123');
  t.equal(pattern2.render({name: 'bar'}), '/test/bar/123');
  t.end();
});

t.test('Multiple optional placeholders in the middle', t => {
  const pattern = new Pattern('/test/:a/123/:b/456');
  pattern.defaults = {a: 'a', b: 'b'};
  t.same(pattern.match('/test/123/456', {ext: 1}), {a: 'a', b: 'b'});
  t.same(pattern.match('/test/c/123/456', 1), {a: 'c', b: 'b'});
  t.same(pattern.match('/test/123/c/456', 1), {a: 'a', b: 'c'});
  t.same(pattern.match('/test/c/123/d/456', 1), {a: 'c', b: 'd'});
  t.equal(pattern.render(), '/test/a/123/b/456');
  t.equal(pattern.render({a: 'c'}), '/test/c/123/b/456');
  t.equal(pattern.render({b: 'c'}), '/test/a/123/c/456');
  t.equal(pattern.render({a: 'c', b: 'd'}), '/test/c/123/d/456');
  t.end();
});

t.test('Root', t => {
  const pattern = new Pattern('/');
  t.equal(pattern.unparsed, '');
  pattern.defaults = {action: 'index'};
  t.same(pattern.match('/test/foo/bar'), null);
  t.same(pattern.match('/'), {action: 'index'});
  t.equal(pattern.render(), '');
  t.equal(pattern.render({ext: 'txt'}, {isEndpoint: true}), '.txt');
  t.end();
});

t.test('Regex in pattern', t => {
  const pattern = new Pattern('/test/<controller>/:action/<id>', {constraints: {id: /\d+/}});
  pattern.defaults = {action: 'index', id: 1};
  t.same(pattern.match('/test/foo/bar/203'), {controller: 'foo', action: 'bar', id: 203});
  t.same(pattern.match('/test/foo/bar/baz'), null);
  t.equal(pattern.render({controller: 'zzz', action: 'index', id: 13}), '/test/zzz/index/13');
  t.equal(pattern.render({controller: 'zzz'}), '/test/zzz');
  t.end();
});

t.test('Quoted placeholders', t => {
  const pattern = new Pattern('/<:controller>test/<action>', {defaults: {action: 'index'}});
  t.same(pattern.match('/footest/bar'), {controller: 'foo', action: 'bar'});
  t.equal(pattern.render({controller: 'zzz', action: 'lala'}), '/zzztest/lala');
  t.same(pattern.match('/test/lala'), null);
  t.end();
});

t.test('Relaxed', t => {
  const pattern = new Pattern('/test/#controller/:action');
  t.same(pattern.match('/test/foo.bar/baz'), {controller: 'foo.bar', action: 'baz'});
  t.equal(pattern.render({controller: 'foo.bar', action: 'baz'}), '/test/foo.bar/baz');

  const pattern2 = new Pattern('/test/<#groovy>');
  t.same(pattern2.match('/test/foo.bar'), {groovy: 'foo.bar'});
  t.same(pattern2.defaults.ext, undefined);
  t.equal(pattern2.render({groovy: 'foo.bar'}), '/test/foo.bar');
  t.end();
});

t.test('Wildcard', t => {
  const pattern = new Pattern('/test/<:controller>/<*action>');
  t.same(pattern.match('/test/foo/bar.baz/yada'), {controller: 'foo', action: 'bar.baz/yada'});
  t.equal(pattern.render({controller: 'foo', action: 'bar.baz/yada'}), '/test/foo/bar.baz/yada');

  const pattern2 = new Pattern('/tset/:controller/*action');
  t.same(pattern2.match('/tset/foo/bar.baz/yada'), {controller: 'foo', action: 'bar.baz/yada'});
  t.equal(pattern2.render({controller: 'foo', action: 'bar.baz/yada'}), '/tset/foo/bar.baz/yada');
  t.end();
});

t.test('False value', t => {
  const pattern = new Pattern('/:id');
  t.equal(pattern.render({id: 0}), '/0');
  pattern.defaults = {id: 0};
  t.equal(pattern.render(), '/0');
  t.same(pattern.match('/0'), {id: '0'});
  t.end();
});

t.test('Regex in path', t => {
  const pattern = new Pattern('/:test');
  t.same(pattern.match('/test(test)(\\Qtest\\E)('), {test: 'test(test)(\\Qtest\\E)('});
  t.equal(pattern.render({test: '23'}), '/23');
  t.end();
});

t.test('Regex in pattern', t => {
  const pattern = new Pattern('/.+<:test>');
  t.same(pattern.match('/.+test'), {test: 'test'});
  t.equal(pattern.render({test: '23'}), '/.+23');
  t.end();
});

t.test('Unusual values', t => {
  const pattern = new Pattern('/:test');
  let value = decodeURIComponent('abc%3Ccba');
  t.same(pattern.match(`/${value}`), {test: value});
  t.equal(pattern.render({test: value}), `/${value}`);
  value = decodeURIComponent('abc%3Ecba');
  t.same(pattern.match(`/${value}`), {test: value});
  t.equal(pattern.render({test: value}), `/${value}`);
  value = decodeURIComponent('abc%25cba');
  t.same(pattern.match(`/${value}`), {test: value});
  t.equal(pattern.render({test: value}), `/${value}`);
  value = decodeURIComponent('abc%20cba');
  t.same(pattern.match(`/${value}`), {test: value});
  t.equal(pattern.render({test: value}), `/${value}`);
  value = 'abc%20cba';
  t.same(pattern.match(`/${value}`), {test: value});
  t.equal(pattern.render({test: value}), `/${value}`);
  t.end();
});

t.test('Extension detection', t => {
  const pattern = new Pattern('/test');
  pattern.defaults = {action: 'index'};
  pattern.constraints = {ext: ['xml', 'html']};
  t.same(pattern.match('/test.xml', {isEndpoint: true}), {action: 'index', ext: 'xml'});
  t.same(pattern.match('/test.html', {isEndpoint: true}), {action: 'index', ext: 'html'});
  t.same(pattern.match('/test.json'), null);

  const pattern2 = new Pattern('/test.json');
  pattern2.defaults = {action: 'index'};
  t.same(pattern2.match('/test.json'), {action: 'index'});
  t.same(pattern2.match('/test.json', {isEndpoint: true}), {action: 'index'});
  t.same(pattern2.match('/test.xml'), null);
  t.same(pattern2.match('/test'), null);

  const pattern3 = new Pattern('/test');
  pattern3.defaults = {action: 'index'};
  t.same(pattern3.match('/test.xml'), null);
  t.same(pattern3.match('/test'), {action: 'index'});

  const pattern4 = new Pattern('/test', {constraints: {ext: 'txt'}, defaults: {ext: null}});
  t.same(pattern4.match('/test.txt', {isEndpoint: true}), {ext: 'txt'});
  t.same(pattern4.match('/test', {isEndpoint: true}), {ext: null});
  t.same(pattern4.match('/test.xml'), null);
  t.end();
});

t.test('Versioned pattern', t => {
  const pattern = new Pattern('/:test/v1.0', {defaults: {action: 'index', ext: 'html'}});
  const result = pattern.match('/foo/v1.0', {isEndpoint: true});
  t.same(result, {test: 'foo', action: 'index', ext: 'html'});
  t.equal(pattern.render(result), '/foo/v1.0');
  t.equal(pattern.render(result, {isEndpoint: true}), '/foo/v1.0.html');
  t.equal(pattern.render(result, {isEndpoint: false}), '/foo/v1.0');
  t.equal(pattern.render({...result, ext: undefined}, {isEndpoint: true}), '/foo/v1.0');
  t.end();
});

t.test('Versioned pattern with extension', t => {
  const pattern = new Pattern('/:test/v1.0', {defaults: {a: 'b', ext: 'html'}, constraints: {ext: ['gz']}});
  const result = pattern.match('/foo/v1.0.gz', {isEndpoint: true});
  t.same(result, {test: 'foo', a: 'b', ext: 'gz'});
  t.equal(pattern.render(result), '/foo/v1.0');
  t.equal(pattern.render(result, {isEndpoint: true}), '/foo/v1.0.gz');
  t.same(pattern.match('/foo/v2.0', {isEndpoint: true}), null);
  t.end();
});

t.test('Special placeholder names', t => {
  const pattern = new Pattern('/:');
  let result = pattern.match('/foo', {isEndpoint: true});
  t.same(result, {'': 'foo'});
  t.equal(pattern.render(result, {isEndpoint: true}), '/foo');
  t.equal(pattern.render({'': 'bar'}, {isEndpoint: true}), '/bar');

  const pattern2 = new Pattern('/#');
  result = pattern2.match('/foo.bar', {isEndpoint: true});
  t.same(result, {'': 'foo.bar'});
  t.equal(pattern2.render(result, {isEndpoint: true}), '/foo.bar');
  t.equal(pattern2.render({'': 'bar.baz'}, {isEndpoint: true}), '/bar.baz');

  const pattern3 = new Pattern('/*');
  result = pattern3.match('/foo/bar', {isEndpoint: true});
  t.same(result, {'': 'foo/bar'});
  t.equal(pattern3.render(result, {isEndpoint: true}), '/foo/bar');
  t.equal(pattern3.render({'': 'bar/baz'}, {isEndpoint: true}), '/bar/baz');

  const pattern4 = new Pattern('/:/:0');
  result = pattern4.match('/foo/bar', {isEndpoint: true});
  t.same(result, {'': 'foo', 0: 'bar'});
  t.equal(pattern4.render(result, {isEndpoint: true}), '/foo/bar');
  t.equal(pattern4.render({'': 'bar', 0: 'baz'}, {isEndpoint: true}), '/bar/baz');

  const pattern5 = new Pattern('/<:>test/<0>');
  result = pattern5.match('/footest/bar', {isEndpoint: true});
  t.same(result, {'': 'foo', 0: 'bar'});
  t.equal(pattern5.render(result, {isEndpoint: true}), '/footest/bar');

  const pattern6 = new Pattern('/<>test');
  result = pattern6.match('/footest', {isEndpoint: true});
  t.same(result, {'': 'foo'});
  t.equal(pattern6.render(result, {isEndpoint: true}), '/footest');
  t.end();
});

t.test('Normalize slashes', t => {
  const pattern = new Pattern(':foo/');
  let result = pattern.match('/bar', {isEndpoint: true});
  t.same(result, {foo: 'bar'});
  t.equal(pattern.render(result, {isEndpoint: true}), '/bar');

  const pattern2 = new Pattern('//:foo//bar//');
  result = pattern2.match('/foo/bar', {isEndpoint: true});
  t.same(result, {foo: 'foo'});
  t.equal(pattern2.render(result, {isEndpoint: true}), '/foo/bar');

  const pattern3 = new Pattern('//');
  result = pattern3.match('/', {isEndpoint: true});
  t.same(result, {});
  t.equal(pattern3.render(result, {isEndpoint: true}), '');

  const pattern4 = new Pattern('0');
  result = pattern4.match('/0', {isEndpoint: true});
  t.same(result, {});
  t.equal(pattern4.render(result, {isEndpoint: true}), '/0');
  t.end();
});

t.test('Optional extension with constraint', t => {
  const pattern = new Pattern('/', {defaults: {ext: 'txt'}, constraints: {ext: ['txt']}});
  t.same(pattern.match('/', {isEndpoint: true}), {ext: 'txt'});
  t.same(pattern.match('/.txt', {isEndpoint: true}), {ext: 'txt'});
  t.same(pattern.match('/.json', {isEndpoint: true}), null);
  t.end();
});

t.test('Unicode', t => {
  const pattern = new Pattern('/<one>♥<two>');
  const result = pattern.match('/i♥mojolicious');
  t.same(result, {one: 'i', two: 'mojolicious'});
  t.equal(pattern.render(result, {isEndpoint: true}), '/i♥mojolicious');
  t.end();
});

t.test('Placeholder types', t => {
  const pattern = new Pattern('/foo/<bar:num>/baz', {types: {num: /\d+/}});
  const result = pattern.match('/foo/23/baz', {isEndpoint: true});
  t.same(result, {bar: 23});
  t.equal(pattern.render(result, {isEndpoint: true}), '/foo/23/baz');
  t.same(pattern.match('/foo/bar/baz', {isEndpoint: true}), null);

  const pattern2 = new Pattern('/foo/<bar:color>/baz', {types: {color: ['blue', 'red']}});
  t.same(pattern2.match('/foo/blue/baz'), {bar: 'blue'});
  t.same(pattern2.match('/foo/red/baz'), {bar: 'red'});
  t.same(pattern2.match('/foo/green/baz'), null);
  t.end();
});

t.test('Missing placeholder type (never matches)', t => {
  const pattern = new Pattern('/foo/<bar:unknown>');
  t.same(pattern.types.unknown, undefined);
  t.same(pattern.match('/foo/23', {isEndpoint: true}), null);
  t.same(pattern.match('/foo/bar', {isEndpoint: true}), null);
  t.same(pattern.match('/foo', {isEndpoint: true}), null);
  t.end();
});
