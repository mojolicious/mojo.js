'use strict';

const t = require('tap');
const {Router} = require('..');

/*
 * /0
 */
const r = new Router();
r.any('0').to({null: 0}).name('null');

/*
 * /alternatives
 * /alternatives/0
 * /alternatives/test
 * /alternatives/23
 */
r.any('/alternatives/:foo', {foo: ['0', 'test', '23']}).to({foo: 11});

/*
 * /alternatives2/0
 * /alternatives2/test
 * /alternatives2/23
 */
r.any('/alternatives2/:foo/', {foo: ['0', 'test', '23']});

/*
 * /alternatives3/foo
 * /alternatives3/foobar
 */
r.any('/alternatives3/:foo', {foo: ['foo', 'foobar']});

/*
 * /alternatives4/foo
 * /alternatives4/foo.bar
 */
r.any('/alternatives4/:foo', {foo: ['foo', 'foo.bar']});

/*
 * /optional/*
 * /optional/**
 * /optional/**.txt
 */
r.any('/optional/:foo/:bar', {ext: 'txt'}).to({bar: 'test', ext: null});

/*
 * /optional2
 * /optional2/*
 * /optional2/**
 * /optional2/**.txt
 */
r.any('/optional2/:foo').to({foo: 'one'}).any('/:bar', {ext: 'txt'}).to({bar: 'two', ext: null});

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
