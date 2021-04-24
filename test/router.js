'use strict';

import t from 'tap';
import Router from '../lib/router.js';

//* /0
const r = new Router();
r.any('0').to({null: 0}).name('null');

//* /alternatives
//* /alternatives/0
//* /alternatives/test
//* /alternatives/23
r.any('/alternatives/:foo', {foo: ['0', 'test', '23']}).to({foo: 11});

//* /alternatives2/0
//* /alternatives2/test
//* /alternatives2/23
r.any('/alternatives2/:foo/', {foo: ['0', 'test', '23']});

//* /alternatives3/foo
//* /alternatives3/foobar
r.any('/alternatives3/:foo', {foo: ['foo', 'foobar']});

//* /alternatives4/foo
//* /alternatives4/foo.bar
r.any('/alternatives4/:foo', {foo: ['foo', 'foo.bar']});

//* /optional/*
//* /optional/*/*
//* /optional/*/*.txt
r.any('/optional/:foo/:bar', {ext: 'txt'}).to({bar: 'test', ext: null});

//* /optional2
//* /optional2/*
//* /optional2/*/*
//* /optional2/*/*.txt
r.any('/optional2/:foo').to({foo: 'one'}).any('/:bar', {ext: 'txt'}).to({bar: 'two', ext: null});

//* /*/test
const test = r.any('/:testcase/test').to({action: 'test'});

//* /*/test/edit
test.any('/edit').to({action: 'edit'}).name('test_edit');

//* /*/testedit
r.any('/:testcase/testedit').to({action: 'testedit'});

//* /*/test/delete/*
test.any('/delete/<id>', {id: /\d+/}).to({action: 'delete', id: 23});

//* /test2
const test2 = r.under('/test2/').to({testcase: 'test2'});

//* /test2 (inline)
const test4 = test2.under('/').to({testcase: 'index'});

//* /test2/foo
test4.any('/foo').to({testcase: 'baz'});

//* /test2/bar
test4.any('/bar').to({testcase: 'lalala'});

//* /test2/baz
test2.any('/baz').to('just#works');

//* /websocket
r.websocket('/websocket').to({testcase: 'ws'}).any('/').to({action: 'just'}).any().to({works: 1});

t.test('No match', t => {
  t.same(r.plot({method: 'GET', path: '/does_not_exist'}), null, 'no result');
  t.done();
});

t.test('Introspect', t => {
  t.equal(r.lookup('null').customName, 'null', 'right name');
  t.done();
});

t.test('Null route', t => {
  const plan = r.plot({method: 'GET', path: '/0'});
  t.same(plan.steps, [{null: 0}], 'right structure');
  t.same(plan.stops, [true], 'right structure');
  t.equal(plan.render().path, '/0', 'right path');
  t.equal(plan.endpoint.defaultName, '0', 'right name');
  t.done();
});

t.test('Alternatives with default', t => {
  const plan = r.plot({method: 'GET', path: '/alternatives'});
  t.same(plan.steps, [{foo: 11}], 'right structure');
  t.equal(plan.render().path, '/alternatives', 'right path');
  t.equal(plan.render({ext: 'txt'}).path, '/alternatives/11.txt', 'right path');
  t.equal(plan.render({foo: 12}).path, '/alternatives/12', 'right path');
  t.equal(plan.render({foo: 12, ext: 'txt'}).path, '/alternatives/12.txt', 'right path');
  t.equal(plan.endpoint.defaultName, 'alternatives_foo', 'right name');
  t.ok(Object.is(plan.endpoint, r.lookup('alternatives_foo')), 'same object');
  const plan2 = r.plot({method: 'GET', path: '/alternatives/0'});
  t.same(plan2.steps, [{foo: 0}], 'right structure');
  t.equal(plan2.render().path, '/alternatives/0', 'right path');
  const plan3 = r.plot({method: 'GET', path: '/alternatives/test'});
  t.same(plan3.steps, [{foo: 'test'}], 'right structure');
  t.equal(plan3.render().path, '/alternatives/test', 'right path');
  const plan4 = r.plot({method: 'GET', path: '/alternatives/23'});
  t.same(plan4.steps, [{foo: 23}], 'right structure');
  t.equal(plan4.render().path, '/alternatives/23', 'right path');
  t.same(r.plot({method: 'GET', path: '/alternatives/24'}), null, 'no result');
  t.same(r.plot({method: 'GET', path: '/alternatives/tset'}), null, 'no result');
  t.same(r.plot({method: 'GET', path: '/alternatives/00'}), null, 'no result');
  t.equal(r.lookup('alternatives_foo').render(), '/alternatives', 'right path');
  t.equal(r.lookup('alternatives_foo').render({ext: 'txt'}), '/alternatives/11.txt', 'right path');
  t.equal(r.lookup('alternatives_foo').render({foo: 12, ext: 'txt'}), '/alternatives/12.txt', 'right path');
  t.done();
});

t.test('Alternatives without default', t => {
  t.same(r.plot({method: 'GET', path: '/alternatives/2'}), null, 'no result');
  const plan = r.plot({method: 'GET', path: '/alternatives2/0'});
  t.same(plan.steps, [{foo: '0'}], 'right structure');
  t.equal(plan.render().path, '/alternatives2/0', 'right path');
  const plan2 = r.plot({method: 'GET', path: '/alternatives2/test'});
  t.same(plan2.steps, [{foo: 'test'}], 'right structure');
  t.same(plan2.stops, [true], 'right structure');
  t.equal(plan2.render().path, '/alternatives2/test', 'right path');
  const plan3 = r.plot({method: 'GET', path: '/alternatives2/23'});
  t.same(plan3.steps, [{foo: '23'}], 'right structure');
  t.equal(plan3.render().path, '/alternatives2/23', 'right path');
  t.same(r.plot({method: 'GET', path: '/alternatives2/24'}), null, 'no result');
  t.same(r.plot({method: 'GET', path: '/alternatives2/tset'}), null, 'no result');
  t.same(r.plot({method: 'GET', path: '/alternatives2/00'}), null, 'no result');
  t.equal(r.lookup('alternatives2_foo').render(), '/alternatives2/', 'right path');
  t.equal(r.lookup('alternatives2_foo').render({foo: 0}), '/alternatives2/0', 'right path');
  t.done();
});

t.test('Alternatives with similar start', t => {
  const plan = r.plot({method: 'GET', path: '/alternatives3/foo'});
  t.same(plan.steps, [{foo: 'foo'}], 'right structure');
  t.equal(plan.render().path, '/alternatives3/foo', 'right path');
  const plan2 = r.plot({method: 'GET', path: '/alternatives3/foobar'});
  t.same(plan2.steps, [{foo: 'foobar'}], 'right structure');
  t.equal(plan2.render().path, '/alternatives3/foobar', 'right path');
  t.done();
});

t.test('Alternatives with special characters', t => {
  const plan = r.plot({method: 'GET', path: '/alternatives4/foo'});
  t.same(plan.steps, [{foo: 'foo'}], 'right structure');
  t.equal(plan.render().path, '/alternatives4/foo', 'right path');
  const plan2 = r.plot({method: 'GET', path: '/alternatives4/foo.bar'});
  t.same(plan2.steps, [{foo: 'foo.bar'}], 'right structure');
  t.equal(plan2.render().path, '/alternatives4/foo.bar', 'right path');
  t.same(r.plot({method: 'GET', path: '/alternatives4/foobar'}), null, 'no result');
  t.same(r.plot({method: 'GET', path: '/alternatives4/bar'}), null, 'no result');
  t.same(r.plot({method: 'GET', path: '/alternatives4/bar.foo'}), null, 'no result');
  t.done();
});

t.test('Optional placeholder', t => {
  const plan = r.plot({method: 'GET', path: '/optional/23'});
  t.same(plan.steps, [{foo: 23, bar: 'test', ext: null}], 'right structure');
  t.equal(plan.render().path, '/optional/23', 'right path');
  t.equal(plan.render({ext: 'txt'}).path, '/optional/23/test.txt', 'right path');
  t.equal(plan.render({foo: 12, ext: 'txt'}).path, '/optional/12/test.txt', 'right path');
  const plan2 = r.plot({method: 'GET', path: '/optional/23/24'});
  t.same(plan2.steps, [{foo: 23, bar: '24', ext: null}], 'right structure');
  t.equal(plan2.render().path, '/optional/23/24', 'right path');
  t.equal(plan2.render({ext: 'txt'}).path, '/optional/23/24.txt', 'right path');
  t.done();
});

t.test('Optional placeholders in nested routes', t => {
  const plan = r.plot({method: 'GET', path: '/optional2'});
  t.same(plan.steps, [{foo: 'one'}, {bar: 'two', ext: null}], 'right structure');
  t.same(plan.stops, [false, true], 'right structure');
  t.equal(plan.render().path, '/optional2', 'right path');
  const plan2 = r.plot({method: 'GET', path: '/optional2/three'});
  t.same(plan2.steps, [{foo: 'three'}, {bar: 'two', ext: null}], 'right structure');
  t.same(plan2.stops, [false, true], 'right structure');
  t.equal(plan2.render().path, '/optional2/three', 'right path');
  const plan3 = r.plot({method: 'GET', path: '/optional2/three/four'});
  t.same(plan3.steps, [{foo: 'three'}, {bar: 'four', ext: null}], 'right structure');
  t.equal(plan3.render().path, '/optional2/three/four', 'right path');
  const plan4 = r.plot({method: 'GET', path: '/optional2/three/four.txt'});
  t.same(plan4.steps, [{foo: 'three'}, {bar: 'four', ext: 'txt'}], 'right structure');
  t.equal(plan4.render().path, '/optional2/three/four.txt', 'right path');
  const plan5 = r.plot({method: 'GET', path: '/optional2.txt'});
  t.same(plan5.steps, [{foo: 'one'}, {bar: 'two', ext: 'txt'}], 'right structure');
  t.equal(plan5.render().path, '/optional2/one/two.txt', 'right path');
  const plan6 = r.plot({method: 'GET', path: '/optional2/three.txt'});
  t.same(plan6.steps, [{foo: 'three'}, {bar: 'two', ext: 'txt'}], 'right structure');
  t.equal(plan6.render().path, '/optional2/three/two.txt', 'right path');
  t.same(r.plot({method: 'GET', path: '/optional2.xml'}), null, 'no result');
  t.same(r.plot({method: 'GET', path: '/optional2/three.xml'}), null, 'no result');
  t.same(r.plot({method: 'GET', path: '/optional2/three/four.xml'}), null, 'no result');
  t.same(r.plot({method: 'GET', path: '/optional2/three/four/five'}), null, 'no result');
  t.done();
});

t.test('Path and captures', t => {
  const plan = r.plot({method: 'GET', path: '/foo/test/edit'});
  t.same(plan.steps, [{testcase: 'foo', action: 'test'}, {action: 'edit'}], 'right structure');
  t.equal(plan.render().path, '/foo/test/edit', 'right path');
  const plan2 = r.plot({method: 'GET', path: '/foo/testedit'});
  t.same(plan2.steps, [{testcase: 'foo', action: 'testedit'}], 'right structure');
  t.equal(plan2.render().path, '/foo/testedit', 'right path');
  t.done();
});

t.test('Optional captures in sub route with requirement', t => {
  const plan = r.plot({method: 'GET', path: '/bar/test/delete/22'});
  t.same(plan.steps, [{testcase: 'bar', action: 'test'}, {action: 'delete', id: 22}], 'right structure');
  t.equal(plan.render().path, '/bar/test/delete/22', 'right path');
  t.done();
});

t.test('Defaults in sub route', t => {
  const plan = r.plot({method: 'GET', path: '/bar/test/delete'});
  t.same(plan.steps, [{testcase: 'bar', action: 'test'}, {action: 'delete', id: 23}], 'right structure');
  t.equal(plan.render().path, '/bar/test/delete', 'right path');
  t.done();
});

t.test('Chained routes', t => {
  const plan = r.plot({method: 'GET', path: '/test2/foo'});
  t.same(plan.steps, [{testcase: 'test2'}, {testcase: 'index'}, {testcase: 'baz'}], 'right structure');
  t.same(plan.stops, [true, true, true], 'right structure');
  t.equal(plan.render().path, '/test2/foo', 'right path');
  const plan2 = r.plot({method: 'GET', path: '/test2/bar'});
  t.same(plan2.steps, [{testcase: 'test2'}, {testcase: 'index'}, {testcase: 'lalala'}], 'right structure');
  t.same(plan2.stops, [true, true, true], 'right structure');
  t.equal(plan2.render().path, '/test2/bar', 'right path');
  const plan3 = r.plot({method: 'GET', path: '/test2/baz'});
  t.same(plan3.steps, [{testcase: 'test2'}, {controller: 'just', action: 'works'}], 'right structure');
  t.same(plan3.stops, [true, true], 'right structure');
  t.equal(plan3.render().path, '/test2/baz', 'right path');
  t.same(r.plot({method: 'GET', path: '/test2baz'}), null, 'no result');
  t.done();
});

t.test('WebSocket', t => {
  t.same(r.plot({method: 'GET', path: '/websocket'}), null, 'no result');
  const plan = r.plot({method: 'GET', path: '/websocket', websocket: true});
  t.same(plan.steps, [{testcase: 'ws'}, {action: 'just'}, {works: 1}], 'right structure');
  t.equal(plan.render().path, '/websocket', 'right path');
  t.same(plan.stops, [false, false, true], 'right structure');
  t.done();
});
