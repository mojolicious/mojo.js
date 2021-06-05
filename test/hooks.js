'use strict';

const Hooks = require('../lib/hooks');
const t = require('tap');
const util = require('../lib/util');

t.test('Hooks', async t => {
  await t.test('Simple hook chain', async t => {
    const hooks = new Hooks();
    const results = [];

    hooks.addHook('foo', async value => {
      results.push(value + 1);
      results.push(1);
      await util.sleep(1);
      results.push(2);
    });
    hooks.addHook('foo', async value => {
      results.push(value + 2);
      results.push(3);
      await util.sleep(1);
      results.push(4);
    });
    hooks.addHook('foo', async value => {
      results.push(value + 3);
      results.push(5);
      await util.sleep(1);
      results.push(6);
    });

    await hooks.runHook('foo', 'test');
    t.same(results, ['test1', 1, 2, 'test2', 3, 4, 'test3', 5, 6]);
  });

  await t.test('Multiple runs', async t => {
    const hooks = new Hooks();
    let results = [];

    hooks.addHook('foo', async value => {
      results.push(value + 1);
      results.push(1);
    });
    hooks.addHook('foo', async value => {
      results.push(value + 2);
      results.push(2);
      await util.sleep(1);
      results.push(3);
    });

    await hooks.runHook('foo', 'first');
    t.same(results, ['first1', 1, 'first2', 2, 3]);

    results = [];
    await hooks.runHook('foo', 'second');
    t.same(results, ['second1', 1, 'second2', 2, 3]);

    results = [];
    await hooks.runHook('foo', 'third');
    t.same(results, ['third1', 1, 'third2', 2, 3]);
  });

  await t.test('Interrupted chain', async t => {
    const hooks = new Hooks();
    const results = [];

    hooks.addHook('foo', async value => {
      results.push(value + 1);
      results.push(1);
      await util.sleep(1);
      results.push(2);
      return false;
    });
    hooks.addHook('foo', async value => {
      results.push(value + 'fail');
    });

    t.same(await hooks.runHook('foo', 'test'), false);
    t.same(results, ['test1', 1, 2]);
  });

  await t.test('Not all functions are async', async t => {
    const hooks = new Hooks();
    const results = [];

    hooks.addHook('foo', async value => {
      results.push(value + 1);
      results.push(1);
      await util.sleep(1);
      results.push(2);
    });
    hooks.addHook('foo', value => {
      results.push(value + 2);
      results.push(3);
    });
    hooks.addHook('foo', async value => {
      results.push(value + 3);
      results.push(4);
      await util.sleep(1);
      results.push(5);
    });

    await hooks.runHook('foo', 'test');
    t.same(results, ['test1', 1, 2, 'test2', 3, 'test3', 4, 5]);
  });

  await t.test('Multiple values', async t => {
    const hooks = new Hooks();
    const results = [];

    hooks.addHook('bar', async (first, second) => {
      results.push(first + second + 1);
      results.push(1);
      await util.sleep(1);
      results.push(2);
    });
    hooks.addHook('bar', async (first, second) => {
      results.push(first + second + 2);
      results.push(3);
      await util.sleep(1);
      results.push(4);
    });
    hooks.addHook('bar', async (first, second) => {
      results.push(first + second + 3);
      results.push(5);
      await util.sleep(1);
      results.push(6);
    });

    await hooks.runHook('bar', 'test', 123);
    t.same(results, ['test1231', 1, 2, 'test1232', 3, 4, 'test1233', 5, 6]);
  });

  await t.test('Exception in chain', async t => {
    const hooks = new Hooks();
    const results = [];

    hooks.addHook('foo', async value => {
      results.push(value + 1);
      results.push(1);
      await util.sleep(1);
      results.push(2);
      throw new Error('Test');
    });
    hooks.addHook('foo', async value => {
      results.push(value + 'fail');
    });

    let fail;
    await hooks.runHook('foo', 'test').catch(error => (fail = error));
    t.equal(fail.message, 'Test');
    t.same(results, ['test1', 1, 2]);
  });
});
