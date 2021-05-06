import Router from '../lib/router.js';
import t from 'tap';

// * /0
const r = new Router();
r.any('0').to({null: 0}).name('null');

// * /alternatives
// * /alternatives/0
// * /alternatives/test
// * /alternatives/23
r.any('/alternatives/:foo', {foo: ['0', 'test', '23']}).to({foo: 11});

// * /alternatives2/0
// * /alternatives2/test
// * /alternatives2/23
r.any('/alternatives2/:foo/', {foo: ['0', 'test', '23']});

// * /alternatives3/foo
// * /alternatives3/foobar
r.any('/alternatives3/:foo', {foo: ['foo', 'foobar']});

// * /alternatives4/foo
// * /alternatives4/foo.bar
r.any('/alternatives4/:foo', {foo: ['foo', 'foo.bar']});

// * /optional/*
// * /optional/*/*
// * /optional/*/*.txt
r.any('/optional/:foo/:bar', {ext: 'txt'}).to({bar: 'test', ext: null});

// * /optional2
// * /optional2/*
// * /optional2/*/*
// * /optional2/*/*.txt
r.any('/optional2/:foo').to({foo: 'one'}).any('/:bar', {ext: 'txt'}).to({bar: 'two', ext: null});

// * /*/test
const test = r.any('/:testcase/test').to({action: 'test'});

// * /*/test/edit
test.any('/edit').to({action: 'edit'}).name('test_edit');

// * /*/testedit
r.any('/:testcase/testedit').to({action: 'testedit'});

// * /*/test/delete/*
test.any('/delete/<id>', {id: /\d+/}).to({action: 'delete', id: 23});

// * /test2
const test2 = r.under('/test2/').to({testcase: 'test2'});

// * /test2 (inline)
const test4 = test2.under('/').to({testcase: 'index'});

// * /test2/foo
test4.any('/foo').to({testcase: 'baz'});

// * /test2/bar
test4.any('/bar').to({testcase: 'lalala'});

// * /test2/baz
test2.any('/baz').to('just#works');

// * /
r.any('/').to({testcase: 'hello', action: 'world'});

// * /websocket
r.websocket('/websocket').to({testcase: 'ws'}).any('/').to({action: 'just'}).any().to({works: 1});

// * /wildcards/1/*
r.any('/wildcards/1/<*wildcard>', {wildcard: /(?:.*)/}).to({testcase: 'wild', action: 'card'});

// * /wildcards/2/*
r.any('/wildcards/2/*wildcard').to({testcase: 'card', action: 'wild'});

// * /wildcards/3/*/foo
r.any('/wildcards/3/<*wildcard>/foo').to({testcase: 'very', action: 'dangerous'});

// * /wildcards/4/*/foo
r.any('/wildcards/4/*wildcard/foo').to({testcase: 'somewhat', action: 'dangerous'});

// * /ext
// * /ext.*
r.any('/ext', {ext: /.+/}).to({testcase: 'hello'}).to({action: 'you', ext: 'html'});

// * /ext2.txt
r.any('/ext2', {ext: /txt/}).to({testcase: 'we', action: 'howdy'});

// * /ext3.txt
// * /ext3.text
r.any('/ext3', {ext: ['txt', 'text']}).to({testcase: 'we', action: 'cheers'});

// * /ext4
// * /ext4.html
r.any('/ext4', {ext: 'html'}).to({testcase: 'us', action: 'yay', ext: 'html'});

// * /type/23
// * /type/24
r.addType('my_num', ['23', '24']);
r.any('/type/<id:my_num>').to('foo#bar');

// * /type/t*st
r.addType('test', /t.st/);
r.any('/type/<id:test>').to('baz#yada');

// GET /method/get
r.get('/method/get', {ext: 'html'}).to({testcase: 'method', action: 'get', ext: null});

// POST /method/post
r.post('/method/post').to({testcase: 'method', action: 'post'});

// POST|GET /method/post_get
r.any(['POST', 'GET'], '/method/post_get').to({testcase: 'method', action: 'post_get'});

// * /versioned/1.0/test
// * /versioned/1.0/test.xml
// * /versioned/2.4/test
// * /versioned/2.4/test.xml
const versioned = r.any('/versioned');
versioned.any('/1.0').to({testcase: 'bar'}).any('/test', {ext: ['xml']}).to({action: 'baz', ext: null});
versioned.any('/2.4').to({testcase: 'foo'}).any('/test', {ext: ['xml']}).to({action: 'bar', ext: null});

// * /versioned/too/1.0
const too = r.any('/versioned/too').to('too#');
too.any('/1.0').to('#foo');
too.any('/2.0').to('#bar');

// GET /missing/*/name
// GET /missing/too
// GET /missing/too/test
r.get('/missing/:/name').to('missing#placeholder');
r.get('/missing/*/name').to('missing#wildcard');
r.get('/missing/too/*', {'': ['test']}).to({controller: 'missing', action: 'too', '': 'missing'});

t.test('No match', t => {
  t.same(r.plot({method: 'GET', path: '/does_not_exist'}), null);
  t.end();
});

t.test('Introspect', t => {
  t.equal(r.lookup('null').customName, 'null');
  t.end();
});

t.test('Null route', t => {
  const plan = r.plot({method: 'GET', path: '/0'});
  t.same(plan.steps, [{null: 0}]);
  t.same(plan.stops, [true]);
  t.equal(plan.render().path, '/0');
  t.equal(plan.endpoint.defaultName, '0');
  t.end();
});

t.test('Alternatives with default', t => {
  const plan = r.plot({method: 'GET', path: '/alternatives'});
  t.same(plan.steps, [{foo: 11}]);
  t.equal(plan.render().path, '/alternatives');
  t.equal(plan.render({ext: 'txt'}).path, '/alternatives/11.txt');
  t.equal(plan.render({foo: 12}).path, '/alternatives/12');
  t.equal(plan.render({foo: 12, ext: 'txt'}).path, '/alternatives/12.txt');
  t.equal(plan.endpoint.defaultName, 'alternatives_foo');
  t.ok(Object.is(plan.endpoint, r.lookup('alternatives_foo')), 'same object');

  const plan2 = r.plot({method: 'GET', path: '/alternatives/0'});
  t.same(plan2.steps, [{foo: 0}]);
  t.equal(plan2.render().path, '/alternatives/0');

  const plan3 = r.plot({method: 'GET', path: '/alternatives/test'});
  t.same(plan3.steps, [{foo: 'test'}]);
  t.equal(plan3.render().path, '/alternatives/test');

  const plan4 = r.plot({method: 'GET', path: '/alternatives/23'});
  t.same(plan4.steps, [{foo: 23}]);
  t.equal(plan4.render().path, '/alternatives/23');
  t.same(r.plot({method: 'GET', path: '/alternatives/24'}), null);
  t.same(r.plot({method: 'GET', path: '/alternatives/tset'}), null);
  t.same(r.plot({method: 'GET', path: '/alternatives/00'}), null);
  t.equal(r.lookup('alternatives_foo').render(), '/alternatives');
  t.equal(r.lookup('alternatives_foo').render({ext: 'txt'}), '/alternatives/11.txt');
  t.equal(r.lookup('alternatives_foo').render({foo: 12, ext: 'txt'}), '/alternatives/12.txt');
  t.end();
});

t.test('Alternatives without default', t => {
  t.same(r.plot({method: 'GET', path: '/alternatives/2'}), null);
  const plan = r.plot({method: 'GET', path: '/alternatives2/0'});
  t.same(plan.steps, [{foo: '0'}]);
  t.equal(plan.render().path, '/alternatives2/0');

  const plan2 = r.plot({method: 'GET', path: '/alternatives2/test'});
  t.same(plan2.steps, [{foo: 'test'}]);
  t.same(plan2.stops, [true]);
  t.equal(plan2.render().path, '/alternatives2/test');

  const plan3 = r.plot({method: 'GET', path: '/alternatives2/23'});
  t.same(plan3.steps, [{foo: '23'}]);
  t.equal(plan3.render().path, '/alternatives2/23');
  t.same(r.plot({method: 'GET', path: '/alternatives2/24'}), null);
  t.same(r.plot({method: 'GET', path: '/alternatives2/tset'}), null);
  t.same(r.plot({method: 'GET', path: '/alternatives2/00'}), null);
  t.equal(r.lookup('alternatives2_foo').render(), '/alternatives2/');
  t.equal(r.lookup('alternatives2_foo').render({foo: 0}), '/alternatives2/0');
  t.end();
});

t.test('Alternatives with similar start', t => {
  const plan = r.plot({method: 'GET', path: '/alternatives3/foo'});
  t.same(plan.steps, [{foo: 'foo'}]);
  t.equal(plan.render().path, '/alternatives3/foo');

  const plan2 = r.plot({method: 'GET', path: '/alternatives3/foobar'});
  t.same(plan2.steps, [{foo: 'foobar'}]);
  t.equal(plan2.render().path, '/alternatives3/foobar');
  t.end();
});

t.test('Alternatives with special characters', t => {
  const plan = r.plot({method: 'GET', path: '/alternatives4/foo'});
  t.same(plan.steps, [{foo: 'foo'}]);
  t.equal(plan.render().path, '/alternatives4/foo');

  const plan2 = r.plot({method: 'GET', path: '/alternatives4/foo.bar'});
  t.same(plan2.steps, [{foo: 'foo.bar'}]);
  t.equal(plan2.render().path, '/alternatives4/foo.bar');
  t.same(r.plot({method: 'GET', path: '/alternatives4/foobar'}), null);
  t.same(r.plot({method: 'GET', path: '/alternatives4/bar'}), null);
  t.same(r.plot({method: 'GET', path: '/alternatives4/bar.foo'}), null);
  t.end();
});

t.test('Optional placeholder', t => {
  const plan = r.plot({method: 'GET', path: '/optional/23'});
  t.same(plan.steps, [{foo: 23, bar: 'test', ext: null}]);
  t.equal(plan.render().path, '/optional/23');
  t.equal(plan.render({ext: 'txt'}).path, '/optional/23/test.txt');
  t.equal(plan.render({foo: 12, ext: 'txt'}).path, '/optional/12/test.txt');

  const plan2 = r.plot({method: 'GET', path: '/optional/23/24'});
  t.same(plan2.steps, [{foo: 23, bar: '24', ext: null}]);
  t.equal(plan2.render().path, '/optional/23/24');
  t.equal(plan2.render({ext: 'txt'}).path, '/optional/23/24.txt');
  t.end();
});

t.test('Optional placeholders in nested routes', t => {
  const plan = r.plot({method: 'GET', path: '/optional2'});
  t.same(plan.steps, [{foo: 'one'}, {bar: 'two', ext: null}]);
  t.same(plan.stops, [false, true]);
  t.equal(plan.render().path, '/optional2');

  const plan2 = r.plot({method: 'GET', path: '/optional2/three'});
  t.same(plan2.steps, [{foo: 'three'}, {bar: 'two', ext: null}]);
  t.same(plan2.stops, [false, true]);
  t.equal(plan2.render().path, '/optional2/three');

  const plan3 = r.plot({method: 'GET', path: '/optional2/three/four'});
  t.same(plan3.steps, [{foo: 'three'}, {bar: 'four', ext: null}]);
  t.equal(plan3.render().path, '/optional2/three/four');

  const plan4 = r.plot({method: 'GET', path: '/optional2/three/four.txt'});
  t.same(plan4.steps, [{foo: 'three'}, {bar: 'four', ext: 'txt'}]);
  t.equal(plan4.render().path, '/optional2/three/four.txt');

  const plan5 = r.plot({method: 'GET', path: '/optional2.txt'});
  t.same(plan5.steps, [{foo: 'one'}, {bar: 'two', ext: 'txt'}]);
  t.equal(plan5.render().path, '/optional2/one/two.txt');

  const plan6 = r.plot({method: 'GET', path: '/optional2/three.txt'});
  t.same(plan6.steps, [{foo: 'three'}, {bar: 'two', ext: 'txt'}]);
  t.equal(plan6.render().path, '/optional2/three/two.txt');
  t.same(r.plot({method: 'GET', path: '/optional2.xml'}), null);
  t.same(r.plot({method: 'GET', path: '/optional2/three.xml'}), null);
  t.same(r.plot({method: 'GET', path: '/optional2/three/four.xml'}), null);
  t.same(r.plot({method: 'GET', path: '/optional2/three/four/five'}), null);
  t.end();
});

t.test('Root', t => {
  const plan = r.plot({method: 'GET', path: '/'});
  t.same(plan.steps, [{testcase: 'hello', action: 'world'}]);
  t.equal(plan.render().path, '');
  t.end();
});

t.test('Path and captures', t => {
  const plan = r.plot({method: 'GET', path: '/foo/test/edit'});
  t.same(plan.steps, [{testcase: 'foo', action: 'test'}, {action: 'edit'}]);
  t.equal(plan.render().path, '/foo/test/edit');

  const plan2 = r.plot({method: 'GET', path: '/foo/testedit'});
  t.same(plan2.steps, [{testcase: 'foo', action: 'testedit'}]);
  t.equal(plan2.render().path, '/foo/testedit');
  t.end();
});

t.test('Optional captures in sub route with requirement', t => {
  const plan = r.plot({method: 'GET', path: '/bar/test/delete/22'});
  t.same(plan.steps, [{testcase: 'bar', action: 'test'}, {action: 'delete', id: 22}]);
  t.equal(plan.render().path, '/bar/test/delete/22');
  t.end();
});

t.test('Defaults in sub route', t => {
  const plan = r.plot({method: 'GET', path: '/bar/test/delete'});
  t.same(plan.steps, [{testcase: 'bar', action: 'test'}, {action: 'delete', id: 23}]);
  t.equal(plan.render().path, '/bar/test/delete');
  t.end();
});

t.test('Chained routes', t => {
  const plan = r.plot({method: 'GET', path: '/test2/foo'});
  t.same(plan.steps, [{testcase: 'test2'}, {testcase: 'index'}, {testcase: 'baz'}]);
  t.same(plan.stops, [true, true, true]);
  t.equal(plan.render().path, '/test2/foo');

  const plan2 = r.plot({method: 'GET', path: '/test2/bar'});
  t.same(plan2.steps, [{testcase: 'test2'}, {testcase: 'index'}, {testcase: 'lalala'}]);
  t.same(plan2.stops, [true, true, true]);
  t.equal(plan2.render().path, '/test2/bar');

  const plan3 = r.plot({method: 'GET', path: '/test2/baz'});
  t.same(plan3.steps, [{testcase: 'test2'}, {controller: 'just', action: 'works'}]);
  t.same(plan3.stops, [true, true]);
  t.equal(plan3.render().path, '/test2/baz');
  t.same(r.plot({method: 'GET', path: '/test2baz'}), null);
  t.end();
});

t.test('WebSocket', t => {
  t.same(r.plot({method: 'GET', path: '/websocket'}), null);
  const plan = r.plot({method: 'GET', path: '/websocket', websocket: true});
  t.same(plan.steps, [{testcase: 'ws'}, {action: 'just'}, {works: 1}]);
  t.equal(plan.render().path, '/websocket');
  t.same(plan.stops, [false, false, true]);
  t.end();
});

t.test('Wildcards', t => {
  const plan = r.plot({method: 'GET', path: '/wildcards/1/hello/there'});
  t.same(plan.steps, [{testcase: 'wild', action: 'card', wildcard: 'hello/there'}]);
  t.equal(plan.render().path, '/wildcards/1/hello/there');
  t.equal(plan.render({wildcard: ''}).path, '/wildcards/1/');

  const plan2 = r.plot({method: 'GET', path: '/wildcards/2/hello/there'});
  t.same(plan2.steps, [{testcase: 'card', action: 'wild', wildcard: 'hello/there'}]);
  t.equal(plan2.render().path, '/wildcards/2/hello/there');

  const plan3 = r.plot({method: 'GET', path: '/wildcards/3/hello/there/foo'});
  t.same(plan3.steps, [{testcase: 'very', action: 'dangerous', wildcard: 'hello/there'}]);
  t.equal(plan3.render().path, '/wildcards/3/hello/there/foo');

  const plan4 = r.plot({method: 'GET', path: '/wildcards/4/hello/there/foo'});
  t.same(plan4.steps, [{testcase: 'somewhat', action: 'dangerous', wildcard: 'hello/there'}]);
  t.equal(plan4.render().path, '/wildcards/4/hello/there/foo');
  t.end();
});

t.test('Extensions', t => {
  const plan = r.plot({method: 'GET', path: '/ext'});
  t.same(plan.steps, [{testcase: 'hello', action: 'you', ext: 'html'}]);
  t.equal(plan.render().path, '/ext.html');
  t.equal(plan.render({ext: null}).path, '/ext');
  t.equal(plan.render({ext: 'html'}).path, '/ext.html');

  const plan2 = r.plot({method: 'GET', path: '/ext.html'});
  t.same(plan2.steps, [{testcase: 'hello', action: 'you', ext: 'html'}]);
  t.equal(plan2.render().path, '/ext.html');
  t.equal(plan2.render({ext: 'txt'}).path, '/ext.txt');
  t.end();
});

t.test('Extension with regex constraint', t => {
  t.same(r.plot({method: 'GET', path: '/ext2'}), null);
  const plan = r.plot({method: 'GET', path: '/ext2.txt'});
  t.same(plan.steps, [{testcase: 'we', action: 'howdy', ext: 'txt'}]);
  t.equal(plan.render().path, '/ext2.txt');
  t.same(r.plot({method: 'GET', path: '/ext2.html'}), null);
  t.same(r.plot({method: 'GET', path: '/ext2.txt.txt'}), null);
  t.end();
});

t.test('Extension with constraint alternatives', t => {
  t.same(r.plot({method: 'GET', path: '/ext3'}), null);
  const plan = r.plot({method: 'GET', path: '/ext3.txt'});
  t.same(plan.steps, [{testcase: 'we', action: 'cheers', ext: 'txt'}]);
  t.equal(plan.render().path, '/ext3.txt');

  const plan2 = r.plot({method: 'GET', path: '/ext3.text'});
  t.same(plan2.steps, [{testcase: 'we', action: 'cheers', ext: 'text'}]);
  t.equal(plan2.render().path, '/ext3.text');
  t.same(r.plot({method: 'GET', path: '/ext3.html'}), null);
  t.same(r.plot({method: 'GET', path: '/ext3.txt.txt'}), null);
  t.end();
});

t.test('Extension with constraint and default', t => {
  const plan = r.plot({method: 'GET', path: '/ext4'});
  t.same(plan.steps, [{testcase: 'us', action: 'yay', ext: 'html'}]);
  t.equal(plan.render().path, '/ext4.html');

  const plan2 = r.plot({method: 'GET', path: '/ext4.html'});
  t.same(plan2.steps, [{testcase: 'us', action: 'yay', ext: 'html'}]);
  t.equal(plan2.render().path, '/ext4.html');
  t.same(r.plot({method: 'GET', path: '/ext4.txt'}), null);
  t.same(r.plot({method: 'GET', path: '/ext4.txt.html'}), null);
  t.end();
});

t.test('Placeholder types', t => {
  const plan = r.plot({method: 'GET', path: '/type/23'});
  t.same(plan.steps, [{controller: 'foo', action: 'bar', id: 23}]);
  t.equal(plan.render().path, '/type/23');

  const plan2 = r.plot({method: 'GET', path: '/type/24'});
  t.same(plan2.steps, [{controller: 'foo', action: 'bar', id: 24}]);
  t.equal(plan2.render().path, '/type/24');
  t.same(r.plot({method: 'GET', path: '/type/25'}), null);

  const plan3 = r.plot({method: 'GET', path: '/type/test'});
  t.same(plan3.steps, [{controller: 'baz', action: 'yada', id: 'test'}]);
  t.equal(plan3.render().path, '/type/test');

  const plan4 = r.plot({method: 'GET', path: '/type/t3st'});
  t.same(plan4.steps, [{controller: 'baz', action: 'yada', id: 't3st'}]);
  t.equal(plan4.render().path, '/type/t3st');
  t.same(r.plot({method: 'GET', path: '/type/t3est'}), null);
  t.end();
});

t.test('Request methods', t => {
  const plan = r.plot({method: 'GET', path: '/method/get'});
  t.same(plan.steps, [{testcase: 'method', action: 'get', ext: null}]);
  t.equal(plan.render().path, '/method/get');
  t.same(r.plot({method: 'POST', path: '/method/get'}), null);

  const plan2 = r.plot({method: 'GET', path: '/method/get.html'});
  t.same(plan2.steps, [{testcase: 'method', action: 'get', ext: 'html'}]);
  t.equal(plan2.render().path, '/method/get.html');

  const plan3 = r.plot({method: 'POST', path: '/method/post'});
  t.same(plan3.steps, [{testcase: 'method', action: 'post'}]);
  t.equal(plan3.render().path, '/method/post');
  t.same(r.plot({method: 'POST', path: '/method/post.html'}), null);
  t.same(r.plot({method: 'GET', path: '/method/post'}), null);

  const plan4 = r.plot({method: 'POST', path: '/method/post_get'});
  t.same(plan4.steps, [{testcase: 'method', action: 'post_get'}]);
  t.equal(plan4.render().path, '/method/post_get');

  const plan5 = r.plot({method: 'GET', path: '/method/post_get'});
  t.same(plan5.steps, [{testcase: 'method', action: 'post_get'}]);
  t.equal(plan5.render().path, '/method/post_get');
  t.same(r.plot({method: 'PUT', path: '/method/get_post'}), null);
  t.end();
});

t.test('Route with version', t => {
  const plan = r.plot({method: 'GET', path: '/versioned/1.0/test'});
  t.same(plan.steps, [{}, {testcase: 'bar'}, {action: 'baz', ext: null}]);
  t.equal(plan.render().path, '/versioned/1.0/test');

  const plan2 = r.plot({method: 'GET', path: '/versioned/1.0/test.xml'});
  t.same(plan2.steps, [{}, {testcase: 'bar'}, {action: 'baz', ext: 'xml'}]);
  t.equal(plan2.render().path, '/versioned/1.0/test.xml');

  const plan3 = r.plot({method: 'GET', path: '/versioned/2.4/test'});
  t.same(plan3.steps, [{}, {testcase: 'foo'}, {action: 'bar', ext: null}]);
  t.equal(plan3.render().path, '/versioned/2.4/test');

  const plan4 = r.plot({method: 'GET', path: '/versioned/2.4/test.xml'});
  t.same(plan4.steps, [{}, {testcase: 'foo'}, {action: 'bar', ext: 'xml'}]);
  t.equal(plan4.render().path, '/versioned/2.4/test.xml');
  t.same(r.plot({method: 'GET', path: '/versioned/3.0/test'}), null);
  t.same(r.plot({method: 'GET', path: '/versioned/3.4/test'}), null);
  t.same(r.plot({method: 'GET', path: '/versioned/0.3/test'}), null);
  t.end();
});

t.test('Route with version at the end', t => {
  const plan = r.plot({method: 'GET', path: '/versioned/too/1.0'});
  t.same(plan.steps, [{controller: 'too'}, {action: 'foo'}]);
  t.equal(plan.render().path, '/versioned/too/1.0');

  const plan2 = r.plot({method: 'GET', path: '/versioned/too/2.0'});
  t.same(plan2.steps, [{controller: 'too'}, {action: 'bar'}]);
  t.equal(plan2.render().path, '/versioned/too/2.0');
  t.end();
});

t.test('Nameless placeholder', t => {
  const plan = r.plot({method: 'GET', path: '/missing/foo/name'});
  t.same(plan.steps, [{controller: 'missing', action: 'placeholder', '': 'foo'}]);
  t.equal(plan.render().path, '/missing/foo/name');

  const plan2 = r.plot({method: 'GET', path: '/missing/foo/bar/name'});
  t.same(plan2.steps, [{controller: 'missing', action: 'wildcard', '': 'foo/bar'}]);
  t.equal(plan2.render().path, '/missing/foo/bar/name');
  t.equal(plan2.render({'': 'bar/baz'}).path, '/missing/bar/baz/name');

  const plan3 = r.plot({method: 'GET', path: '/missing/too/test'});
  t.same(plan3.steps, [{controller: 'missing', action: 'too', '': 'test'}]);
  t.equal(plan3.render().path, '/missing/too/test');
  t.same(r.plot({method: 'GET', path: '/missing/too/tset'}), null);

  const plan4 = r.plot({method: 'GET', path: '/missing/too'});
  t.same(plan4.steps, [{controller: 'missing', action: 'too', '': 'missing'}]);
  t.equal(plan4.render().path, '/missing/too');
  t.end();
});

t.test('Unknown type (matches nothing)', t => {
  const r2 = new Router();
  r2.any('/<foo:does_not_exist>').to({fail: true});
  t.same(r2.plot({method: 'GET', path: '/'}), null);
  t.same(r2.plot({method: 'GET', path: '/test'}), null);
  t.same(r2.plot({method: 'GET', path: '/23'}), null);
  t.end();
});
