import {Router} from '../lib/router.js';
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

// * /target/first
// * /target/second
// * /target/second.xml
// * /source/third
// * /source/third.xml
const source = r.any('/source').to('source#');
const first = source.any('/').any('/first').to('#first');
source.any('/second', {ext: ['xml']}).to({action: 'second', ext: null});
source.any('/third', {ext: ['xml']}).to({action: 'third', ext: null});
const target = r.remove().any('/target').to('target#');
const second = r.find('second');
target.addChild(first);
target.addChild(second.remove());

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
versioned
  .any('/1.0')
  .to({testcase: 'bar'})
  .any('/test', {ext: ['xml']})
  .to({action: 'baz', ext: null});
versioned
  .any('/2.4')
  .to({testcase: 'foo'})
  .any('/test', {ext: ['xml']})
  .to({action: 'bar', ext: null});

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

// GET   /similar/*
// PATCH /similar/too
const similar = r.any(['DELETE', 'GET', 'PATCH'], '/similar');
similar.any(['GET'], '/:something').to('similar#get');
similar.any(['PATCH'], '/too').to('similar#post');

// WebSocket /websocket/route/works
r.any('/websocket').websocket('/route').any('/works').name('websocket_route');

t.test('Router', async t => {
  await t.test('No match', async t => {
    t.same(await r.plot({method: 'GET', path: '/does_not_exist', websocket: false}), null);
  });

  t.test('Introspect', t => {
    t.equal(r.lookup('null').customName, 'null');
    t.same(r.lookup('does-not-exist'), null);
    t.same(r.find('does-not-exist'), null);
    t.end();
  });

  await t.test('Null route', async t => {
    const plan = await r.plot({method: 'GET', path: '/0', websocket: false});
    t.same(plan.steps, [{null: 0}]);
    t.same(plan.stops, [true]);
    t.equal(plan.render().path, '/0');
    t.equal(plan.endpoint.defaultName, '0');
  });

  await t.test('Alternatives with default', async t => {
    const plan = await r.plot({method: 'GET', path: '/alternatives', websocket: false});
    t.same(plan.steps, [{foo: 11}]);
    t.equal(plan.render().path, '/alternatives');
    t.equal(plan.render({ext: 'txt'}).path, '/alternatives/11.txt');
    t.equal(plan.render({foo: 12}).path, '/alternatives/12');
    t.equal(plan.render({foo: 12, ext: 'txt'}).path, '/alternatives/12.txt');
    t.equal(plan.endpoint.defaultName, 'alternatives_foo');
    t.ok(Object.is(plan.endpoint, r.lookup('alternatives_foo')), 'same object');

    const plan2 = await r.plot({method: 'GET', path: '/alternatives/0', websocket: false});
    t.same(plan2.steps, [{foo: 0}]);
    t.equal(plan2.render().path, '/alternatives/0');

    const plan3 = await r.plot({method: 'GET', path: '/alternatives/test', websocket: false});
    t.same(plan3.steps, [{foo: 'test'}]);
    t.equal(plan3.render().path, '/alternatives/test');

    const plan4 = await r.plot({method: 'GET', path: '/alternatives/23', websocket: false});
    t.same(plan4.steps, [{foo: 23}]);
    t.equal(plan4.render().path, '/alternatives/23');
    t.same(await r.plot({method: 'GET', path: '/alternatives/24', websocket: false}), null);
    t.same(await r.plot({method: 'GET', path: '/alternatives/tset', websocket: false}), null);
    t.same(await r.plot({method: 'GET', path: '/alternatives/00', websocket: false}), null);
    t.equal(r.lookup('alternatives_foo').render(), '/alternatives');
    t.equal(r.lookup('alternatives_foo').render({ext: 'txt'}), '/alternatives/11.txt');
    t.equal(r.lookup('alternatives_foo').render({foo: 12, ext: 'txt'}), '/alternatives/12.txt');
  });

  await t.test('Alternatives without default', async t => {
    t.same(await r.plot({method: 'GET', path: '/alternatives/2', websocket: false}), null);
    const plan = await r.plot({method: 'GET', path: '/alternatives2/0'});
    t.same(plan.steps, [{foo: '0'}]);
    t.equal(plan.render().path, '/alternatives2/0');

    const plan2 = await r.plot({method: 'GET', path: '/alternatives2/test', websocket: false});
    t.same(plan2.steps, [{foo: 'test'}]);
    t.same(plan2.stops, [true]);
    t.equal(plan2.render().path, '/alternatives2/test');

    const plan3 = await r.plot({method: 'GET', path: '/alternatives2/23', websocket: false});
    t.same(plan3.steps, [{foo: '23'}]);
    t.equal(plan3.render().path, '/alternatives2/23');
    t.same(await r.plot({method: 'GET', path: '/alternatives2/24', websocket: false}), null);
    t.same(await r.plot({method: 'GET', path: '/alternatives2/tset', websocket: false}), null);
    t.same(await r.plot({method: 'GET', path: '/alternatives2/00', websocket: false}), null);
    t.equal(r.lookup('alternatives2_foo').render(), '/alternatives2/');
    t.equal(r.lookup('alternatives2_foo').render({foo: 0}), '/alternatives2/0');
  });

  await t.test('Alternatives with similar start', async t => {
    const plan = await r.plot({method: 'GET', path: '/alternatives3/foo', websocket: false});
    t.same(plan.steps, [{foo: 'foo'}]);
    t.equal(plan.render().path, '/alternatives3/foo');

    const plan2 = await r.plot({method: 'GET', path: '/alternatives3/foobar', websocket: false});
    t.same(plan2.steps, [{foo: 'foobar'}]);
    t.equal(plan2.render().path, '/alternatives3/foobar');
  });

  await t.test('Alternatives with special characters', async t => {
    const plan = await r.plot({method: 'GET', path: '/alternatives4/foo', websocket: false});
    t.same(plan.steps, [{foo: 'foo'}]);
    t.equal(plan.render().path, '/alternatives4/foo');

    const plan2 = await r.plot({method: 'GET', path: '/alternatives4/foo.bar', websocket: false});
    t.same(plan2.steps, [{foo: 'foo.bar'}]);
    t.equal(plan2.render().path, '/alternatives4/foo.bar');
    t.same(await r.plot({method: 'GET', path: '/alternatives4/foobar', websocket: false}), null);
    t.same(await r.plot({method: 'GET', path: '/alternatives4/bar', websocket: false}), null);
    t.same(await r.plot({method: 'GET', path: '/alternatives4/bar.foo', websocket: false}), null);
  });

  await t.test('Optional placeholder', async t => {
    const plan = await r.plot({method: 'GET', path: '/optional/23', websocket: false});
    t.same(plan.steps, [{foo: 23, bar: 'test', ext: null}]);
    t.equal(plan.render().path, '/optional/23');
    t.equal(plan.render({ext: 'txt'}).path, '/optional/23/test.txt');
    t.equal(plan.render({foo: 12, ext: 'txt'}).path, '/optional/12/test.txt');

    const plan2 = await r.plot({method: 'GET', path: '/optional/23/24', websocket: false});
    t.same(plan2.steps, [{foo: 23, bar: '24', ext: null}]);
    t.equal(plan2.render().path, '/optional/23/24');
    t.equal(plan2.render({ext: 'txt'}).path, '/optional/23/24.txt');
  });

  await t.test('Optional placeholders in nested routes', async t => {
    const plan = await r.plot({method: 'GET', path: '/optional2', websocket: false});
    t.same(plan.steps, [{foo: 'one'}, {bar: 'two', ext: null}]);
    t.same(plan.stops, [false, true]);
    t.equal(plan.render().path, '/optional2');

    const plan2 = await r.plot({method: 'GET', path: '/optional2/three', websocket: false});
    t.same(plan2.steps, [{foo: 'three'}, {bar: 'two', ext: null}]);
    t.same(plan2.stops, [false, true]);
    t.equal(plan2.render().path, '/optional2/three');

    const plan3 = await r.plot({method: 'GET', path: '/optional2/three/four', websocket: false});
    t.same(plan3.steps, [{foo: 'three'}, {bar: 'four', ext: null}]);
    t.equal(plan3.render().path, '/optional2/three/four');

    const plan4 = await r.plot({method: 'GET', path: '/optional2/three/four.txt', websocket: false});
    t.same(plan4.steps, [{foo: 'three'}, {bar: 'four', ext: 'txt'}]);
    t.equal(plan4.render().path, '/optional2/three/four.txt');

    const plan5 = await r.plot({method: 'GET', path: '/optional2.txt', websocket: false});
    t.same(plan5.steps, [{foo: 'one'}, {bar: 'two', ext: 'txt'}]);
    t.equal(plan5.render().path, '/optional2/one/two.txt');

    const plan6 = await r.plot({method: 'GET', path: '/optional2/three.txt', websocket: false});
    t.same(plan6.steps, [{foo: 'three'}, {bar: 'two', ext: 'txt'}]);
    t.equal(plan6.render().path, '/optional2/three/two.txt');
    t.same(await r.plot({method: 'GET', path: '/optional2.xml', websocket: false}), null);
    t.same(await r.plot({method: 'GET', path: '/optional2/three.xml', websocket: false}), null);
    t.same(await r.plot({method: 'GET', path: '/optional2/three/four.xml', websocket: false}), null);
    t.same(await r.plot({method: 'GET', path: '/optional2/three/four/five', websocket: false}), null);
  });

  await t.test('Root', async t => {
    const plan = await r.plot({method: 'GET', path: '/', websocket: false});
    t.same(plan.steps, [{testcase: 'hello', action: 'world'}]);
    t.equal(plan.render().path, '');
  });

  await t.test('Path and captures', async t => {
    const plan = await r.plot({method: 'GET', path: '/foo/test/edit', websocket: false});
    t.same(plan.steps, [{testcase: 'foo', action: 'test'}, {action: 'edit'}]);
    t.equal(plan.render().path, '/foo/test/edit');

    const plan2 = await r.plot({method: 'GET', path: '/foo/testedit', websocket: false});
    t.same(plan2.steps, [{testcase: 'foo', action: 'testedit'}]);
    t.equal(plan2.render().path, '/foo/testedit');
    t.equal(plan.endpoint.suggestedMethod(), 'GET');
  });

  await t.test('Optional captures in sub route with requirement', async t => {
    const plan = await r.plot({method: 'GET', path: '/bar/test/delete/22', websocket: false});
    t.same(plan.steps, [
      {testcase: 'bar', action: 'test'},
      {action: 'delete', id: 22}
    ]);
    t.equal(plan.render().path, '/bar/test/delete/22');
  });

  await t.test('Defaults in sub route', async t => {
    const plan = await r.plot({method: 'GET', path: '/bar/test/delete', websocket: false});
    t.same(plan.steps, [
      {testcase: 'bar', action: 'test'},
      {action: 'delete', id: 23}
    ]);
    t.equal(plan.render().path, '/bar/test/delete');
  });

  await t.test('Chained routes', async t => {
    const plan = await r.plot({method: 'GET', path: '/test2/foo', websocket: false});
    t.same(plan.steps, [{testcase: 'test2'}, {testcase: 'index'}, {testcase: 'baz'}]);
    t.same(plan.stops, [true, true, true]);
    t.equal(plan.render().path, '/test2/foo');

    const plan2 = await r.plot({method: 'GET', path: '/test2/bar', websocket: false});
    t.same(plan2.steps, [{testcase: 'test2'}, {testcase: 'index'}, {testcase: 'lalala'}]);
    t.same(plan2.stops, [true, true, true]);
    t.equal(plan2.render().path, '/test2/bar');

    const plan3 = await r.plot({method: 'GET', path: '/test2/baz', websocket: false});
    t.same(plan3.steps, [{testcase: 'test2'}, {controller: 'just', action: 'works'}]);
    t.same(plan3.stops, [true, true]);
    t.equal(plan3.render().path, '/test2/baz');
    t.same(await r.plot({method: 'GET', path: '/test2baz', websocket: false}), null);
  });

  await t.test('Removed routes', async t => {
    const plan = await r.plot({method: 'GET', path: '/target/first', websocket: false});
    t.same(plan.steps, [{controller: 'target'}, {action: 'first'}]);
    t.same(plan.stops, [false, true]);
    t.equal(plan.render().path, '/target/first');

    t.same(await r.plot({method: 'GET', path: '/target/first.xml', websocket: false}), null);
    t.same(await r.plot({method: 'GET', path: '/source/first', websocket: false}), null);

    const plan2 = await r.plot({method: 'GET', path: '/target/second', websocket: false});
    t.same(plan2.steps, [{controller: 'target'}, {action: 'second', ext: null}]);
    t.same(plan2.stops, [false, true]);
    t.equal(plan2.render().path, '/target/second');

    const plan3 = await r.plot({method: 'GET', path: '/target/second.xml', websocket: false});
    t.same(plan3.steps, [{controller: 'target'}, {action: 'second', ext: 'xml'}]);
    t.same(plan3.stops, [false, true]);
    t.equal(plan3.render().path, '/target/second.xml');

    t.same(await r.plot({method: 'GET', path: '/source/second', websocket: false}), null);

    const plan4 = await r.plot({method: 'GET', path: '/source/third', websocket: false});
    t.same(plan4.steps, [{controller: 'source'}, {action: 'third', ext: null}]);
    t.same(plan4.stops, [false, true]);
    t.equal(plan4.render().path, '/source/third');

    const plan5 = await r.plot({method: 'GET', path: '/source/third.xml', websocket: false});
    t.same(plan5.steps, [{controller: 'source'}, {action: 'third', ext: 'xml'}]);
    t.same(plan5.stops, [false, true]);
    t.equal(plan5.render().path, '/source/third.xml');

    t.same(await r.plot({method: 'GET', path: '/target/third', websocket: false}), null);
  });

  await t.test('WebSocket', async t => {
    t.same(await r.plot({method: 'GET', path: '/websocket', websocket: false}), null);
    const plan = await r.plot({method: 'GET', path: '/websocket', websocket: true});
    t.same(plan.steps, [{testcase: 'ws'}, {action: 'just'}, {works: 1}]);
    t.equal(plan.render().path, '/websocket');
    t.same(plan.stops, [false, false, true]);

    const plan2 = await r.plot({method: 'GET', path: '/websocket/route/works', websocket: true});
    t.same(plan2.steps, [{}, {}, {}]);
    t.equal(plan2.render().path, '/websocket/route/works');
    t.equal(r.lookup('websocket_route').render(), '/websocket/route/works');
  });

  await t.test('Wildcards', async t => {
    const plan = await r.plot({method: 'GET', path: '/wildcards/1/hello/there', websocket: false});
    t.same(plan.steps, [{testcase: 'wild', action: 'card', wildcard: 'hello/there'}]);
    t.equal(plan.render().path, '/wildcards/1/hello/there');
    t.equal(plan.render({wildcard: ''}).path, '/wildcards/1/');

    const plan2 = await r.plot({method: 'GET', path: '/wildcards/2/hello/there', websocket: false});
    t.same(plan2.steps, [{testcase: 'card', action: 'wild', wildcard: 'hello/there'}]);
    t.equal(plan2.render().path, '/wildcards/2/hello/there');

    const plan3 = await r.plot({method: 'GET', path: '/wildcards/3/hello/there/foo', websocket: false});
    t.same(plan3.steps, [{testcase: 'very', action: 'dangerous', wildcard: 'hello/there'}]);
    t.equal(plan3.render().path, '/wildcards/3/hello/there/foo');

    const plan4 = await r.plot({method: 'GET', path: '/wildcards/4/hello/there/foo', websocket: false});
    t.same(plan4.steps, [{testcase: 'somewhat', action: 'dangerous', wildcard: 'hello/there'}]);
    t.equal(plan4.render().path, '/wildcards/4/hello/there/foo');
  });

  await t.test('Extensions', async t => {
    const plan = await r.plot({method: 'GET', path: '/ext', websocket: false});
    t.same(plan.steps, [{testcase: 'hello', action: 'you', ext: 'html'}]);
    t.equal(plan.render().path, '/ext.html');
    t.equal(plan.render({ext: null}).path, '/ext');
    t.equal(plan.render({ext: 'html'}).path, '/ext.html');

    const plan2 = await r.plot({method: 'GET', path: '/ext.html', websocket: false});
    t.same(plan2.steps, [{testcase: 'hello', action: 'you', ext: 'html'}]);
    t.equal(plan2.render().path, '/ext.html');
    t.equal(plan2.render({ext: 'txt'}).path, '/ext.txt');
  });

  await t.test('Extension with regex constraint', async t => {
    t.same(await r.plot({method: 'GET', path: '/ext2', websocket: false}), null);
    const plan = await r.plot({method: 'GET', path: '/ext2.txt'});
    t.same(plan.steps, [{testcase: 'we', action: 'howdy', ext: 'txt'}]);
    t.equal(plan.render().path, '/ext2.txt');
    t.same(await r.plot({method: 'GET', path: '/ext2.html', websocket: false}), null);
    t.same(await r.plot({method: 'GET', path: '/ext2.txt.txt', websocket: false}), null);
  });

  await t.test('Extension with constraint alternatives', async t => {
    t.same(await r.plot({method: 'GET', path: '/ext3', websocket: false}), null);
    const plan = await r.plot({method: 'GET', path: '/ext3.txt', websocket: false});
    t.same(plan.steps, [{testcase: 'we', action: 'cheers', ext: 'txt'}]);
    t.equal(plan.render().path, '/ext3.txt');

    const plan2 = await r.plot({method: 'GET', path: '/ext3.text', websocket: false});
    t.same(plan2.steps, [{testcase: 'we', action: 'cheers', ext: 'text'}]);
    t.equal(plan2.render().path, '/ext3.text');
    t.same(await r.plot({method: 'GET', path: '/ext3.html', websocket: false}), null);
    t.same(await r.plot({method: 'GET', path: '/ext3.txt.txt', websocket: false}), null);
  });

  await t.test('Extension with constraint and default', async t => {
    const plan = await r.plot({method: 'GET', path: '/ext4', websocket: false});
    t.same(plan.steps, [{testcase: 'us', action: 'yay', ext: 'html'}]);
    t.equal(plan.render().path, '/ext4.html');

    const plan2 = await r.plot({method: 'GET', path: '/ext4.html', websocket: false});
    t.same(plan2.steps, [{testcase: 'us', action: 'yay', ext: 'html'}]);
    t.equal(plan2.render().path, '/ext4.html');
    t.same(await r.plot({method: 'GET', path: '/ext4.txt', websocket: false}), null);
    t.same(await r.plot({method: 'GET', path: '/ext4.txt.html', websocket: false}), null);
  });

  await t.test('Placeholder types', async t => {
    const plan = await r.plot({method: 'GET', path: '/type/23', websocket: false});
    t.same(plan.steps, [{controller: 'foo', action: 'bar', id: 23}]);
    t.equal(plan.render().path, '/type/23');

    const plan2 = await r.plot({method: 'GET', path: '/type/24', websocket: false});
    t.same(plan2.steps, [{controller: 'foo', action: 'bar', id: 24}]);
    t.equal(plan2.render().path, '/type/24');
    t.same(await r.plot({method: 'GET', path: '/type/25'}), null);

    const plan3 = await r.plot({method: 'GET', path: '/type/test', websocket: false});
    t.same(plan3.steps, [{controller: 'baz', action: 'yada', id: 'test'}]);
    t.equal(plan3.render().path, '/type/test');

    const plan4 = await r.plot({method: 'GET', path: '/type/t3st', websocket: false});
    t.same(plan4.steps, [{controller: 'baz', action: 'yada', id: 't3st'}]);
    t.equal(plan4.render().path, '/type/t3st');
    t.same(await r.plot({method: 'GET', path: '/type/t3est', websocket: false}), null);
  });

  await t.test('Request methods', async t => {
    const plan = await r.plot({method: 'GET', path: '/method/get', websocket: false});
    t.same(plan.steps, [{testcase: 'method', action: 'get', ext: null}]);
    t.equal(plan.render().path, '/method/get');
    t.same(await r.plot({method: 'POST', path: '/method/get'}), null);

    const plan2 = await r.plot({method: 'GET', path: '/method/get.html', websocket: false});
    t.same(plan2.steps, [{testcase: 'method', action: 'get', ext: 'html'}]);
    t.equal(plan2.render().path, '/method/get.html');
    t.equal(plan2.endpoint.suggestedMethod(), 'GET');

    const plan3 = await r.plot({method: 'POST', path: '/method/post', websocket: false});
    t.same(plan3.steps, [{testcase: 'method', action: 'post'}]);
    t.equal(plan3.render().path, '/method/post');
    t.same(await r.plot({method: 'POST', path: '/method/post.html'}), null);
    t.same(await r.plot({method: 'GET', path: '/method/post'}), null);
    t.equal(plan3.endpoint.suggestedMethod(), 'POST');

    const plan4 = await r.plot({method: 'POST', path: '/method/post_get', websocket: false});
    t.same(plan4.steps, [{testcase: 'method', action: 'post_get'}]);
    t.equal(plan4.render().path, '/method/post_get');

    const plan5 = await r.plot({method: 'GET', path: '/method/post_get', websocket: false});
    t.same(plan5.steps, [{testcase: 'method', action: 'post_get'}]);
    t.equal(plan5.render().path, '/method/post_get');
    t.equal(plan5.endpoint.suggestedMethod(), 'GET');
    t.same(await r.plot({method: 'PUT', path: '/method/get_post', websocket: false}), null);
  });

  await t.test('Route with version', async t => {
    const plan = await r.plot({method: 'GET', path: '/versioned/1.0/test', websocket: false});
    t.same(plan.steps, [{}, {testcase: 'bar'}, {action: 'baz', ext: null}]);
    t.equal(plan.render().path, '/versioned/1.0/test');

    const plan2 = await r.plot({method: 'GET', path: '/versioned/1.0/test.xml', websocket: false});
    t.same(plan2.steps, [{}, {testcase: 'bar'}, {action: 'baz', ext: 'xml'}]);
    t.equal(plan2.render().path, '/versioned/1.0/test.xml');

    const plan3 = await r.plot({method: 'GET', path: '/versioned/2.4/test', websocket: false});
    t.same(plan3.steps, [{}, {testcase: 'foo'}, {action: 'bar', ext: null}]);
    t.equal(plan3.render().path, '/versioned/2.4/test');

    const plan4 = await r.plot({method: 'GET', path: '/versioned/2.4/test.xml', websocket: false});
    t.same(plan4.steps, [{}, {testcase: 'foo'}, {action: 'bar', ext: 'xml'}]);
    t.equal(plan4.render().path, '/versioned/2.4/test.xml');
    t.same(await r.plot({method: 'GET', path: '/versioned/3.0/test', websocket: false}), null);
    t.same(await r.plot({method: 'GET', path: '/versioned/3.4/test', websocket: false}), null);
    t.same(await r.plot({method: 'GET', path: '/versioned/0.3/test', websocket: false}), null);
  });

  await t.test('Route with version at the end', async t => {
    const plan = await r.plot({method: 'GET', path: '/versioned/too/1.0', websocket: false});
    t.same(plan.steps, [{controller: 'too'}, {action: 'foo'}]);
    t.equal(plan.render().path, '/versioned/too/1.0');

    const plan2 = await r.plot({method: 'GET', path: '/versioned/too/2.0', websocket: false});
    t.same(plan2.steps, [{controller: 'too'}, {action: 'bar'}]);
    t.equal(plan2.render().path, '/versioned/too/2.0');
  });

  await t.test('Nameless placeholder', async t => {
    const plan = await r.plot({method: 'GET', path: '/missing/foo/name', websocket: false});
    t.same(plan.steps, [{controller: 'missing', action: 'placeholder', '': 'foo'}]);
    t.equal(plan.render().path, '/missing/foo/name');

    const plan2 = await r.plot({method: 'GET', path: '/missing/foo/bar/name', websocket: false});
    t.same(plan2.steps, [{controller: 'missing', action: 'wildcard', '': 'foo/bar'}]);
    t.equal(plan2.render().path, '/missing/foo/bar/name');
    t.equal(plan2.render({'': 'bar/baz'}).path, '/missing/bar/baz/name');

    const plan3 = await r.plot({method: 'GET', path: '/missing/too/test', websocket: false});
    t.same(plan3.steps, [{controller: 'missing', action: 'too', '': 'test'}]);
    t.equal(plan3.render().path, '/missing/too/test');
    t.same(await r.plot({method: 'GET', path: '/missing/too/tset', websocket: false}), null);

    const plan4 = await r.plot({method: 'GET', path: '/missing/too', websocket: false});
    t.same(plan4.steps, [{controller: 'missing', action: 'too', '': 'missing'}]);
    t.equal(plan4.render().path, '/missing/too');
  });

  await t.test('Similar routes with placeholders', async t => {
    const plan = await r.plot({method: 'GET', path: '/similar/too', websocket: false});
    t.same(plan.steps, [{}, {controller: 'similar', action: 'get', something: 'too'}]);
    t.equal(plan.endpoint.suggestedMethod(), 'GET');

    const plan2 = await r.plot({method: 'PATCH', path: '/similar/too', websocket: false});
    t.same(plan2.steps, [{}, {controller: 'similar', action: 'post'}]);
    t.equal(plan2.endpoint.suggestedMethod(), 'PATCH');

    t.same(await r.plot({method: 'DELETE', path: '/similar/too'}), null);
  });

  await t.test('Unknown type (matches nothing)', async t => {
    const r2 = new Router();
    r2.any('/<foo:does_not_exist>').to({fail: true});
    t.same(await r2.plot({method: 'GET', path: '/', websocket: false}), null);
    t.same(await r2.plot({method: 'GET', path: '/test', websocket: false}), null);
    t.same(await r2.plot({method: 'GET', path: '/23', websocket: false}), null);
  });
});
