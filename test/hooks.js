import Hooks from '../lib/hooks.js';
import t from 'tap';
import * as util from '../lib/util.js';

t.test('Hooks', async t => {
  await t.test('Simple hook chain', async t => {
    const hooks = new Hooks();
    const result = [];

    hooks.addHook('foo', async value => {
      result.push(value + 1);
      result.push(1);
      await util.sleep(1);
      result.push(2);
    });
    hooks.addHook('foo', async value => {
      result.push(value + 2);
      result.push(3);
      await util.sleep(1);
      result.push(4);
    });
    hooks.addHook('foo', async value => {
      result.push(value + 3);
      result.push(5);
      await util.sleep(1);
      result.push(6);
    });

    await hooks.runHook('foo', 'test');
    t.same(result, ['test1', 1, 2, 'test2', 3, 4, 'test3', 5, 6]);
  });

  await t.test('Multiple runs', async t => {
    const hooks = new Hooks();
    let result = [];

    hooks.addHook('foo', async value => {
      result.push(value + 1);
      result.push(1);
    });
    hooks.addHook('foo', async value => {
      result.push(value + 2);
      result.push(2);
      await util.sleep(1);
      result.push(3);
    });

    await hooks.runHook('foo', 'first');
    t.same(result, ['first1', 1, 'first2', 2, 3]);

    result = [];
    await hooks.runHook('foo', 'second');
    t.same(result, ['second1', 1, 'second2', 2, 3]);

    result = [];
    await hooks.runHook('foo', 'third');
    t.same(result, ['third1', 1, 'third2', 2, 3]);
  });

  await t.test('Interrupted chain', async t => {
    const hooks = new Hooks();
    const result = [];

    hooks.addHook('foo', async value => {
      result.push(value + 1);
      result.push(1);
      await util.sleep(1);
      result.push(2);
      return false;
    });
    hooks.addHook('foo', async value => {
      result.push(value + 'fail');
    });

    t.same(await hooks.runHook('foo', 'test'), false);
    t.same(result, ['test1', 1, 2]);
  });

  await t.test('Not all functions are async', async t => {
    const hooks = new Hooks();
    const result = [];

    hooks.addHook('foo', async value => {
      result.push(value + 1);
      result.push(1);
      await util.sleep(1);
      result.push(2);
    });
    hooks.addHook('foo', value => {
      result.push(value + 2);
      result.push(3);
    });
    hooks.addHook('foo', async value => {
      result.push(value + 3);
      result.push(4);
      await util.sleep(1);
      result.push(5);
    });

    await hooks.runHook('foo', 'test');
    t.same(result, ['test1', 1, 2, 'test2', 3, 'test3', 4, 5]);
  });

  await t.test('Multiple values', async t => {
    const hooks = new Hooks();
    const result = [];

    hooks.addHook('bar', async (first, second) => {
      result.push(first + second + 1);
      result.push(1);
      await util.sleep(1);
      result.push(2);
    });
    hooks.addHook('bar', async (first, second) => {
      result.push(first + second + 2);
      result.push(3);
      await util.sleep(1);
      result.push(4);
    });
    hooks.addHook('bar', async (first, second) => {
      result.push(first + second + 3);
      result.push(5);
      await util.sleep(1);
      result.push(6);
    });

    await hooks.runHook('bar', 'test', 123);
    t.same(result, ['test1231', 1, 2, 'test1232', 3, 4, 'test1233', 5, 6]);
  });

  await t.test('Exception in chain', async t => {
    const hooks = new Hooks();
    const result = [];

    hooks.addHook('foo', async value => {
      result.push(value + 1);
      result.push(1);
      await util.sleep(1);
      result.push(2);
      throw new Error('Test');
    });
    hooks.addHook('foo', async value => {
      result.push(value + 'fail');
    });

    let fail;
    await hooks.runHook('foo', 'test').catch(error => (fail = error));
    t.equal(fail.message, 'Test');
    t.same(result, ['test1', 1, 2]);
  });
});
