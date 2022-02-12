import {Cache} from '../lib/cache.js';
import t from 'tap';

t.test('Cache', t => {
  t.test('Basics', t => {
    const cache = new Cache();
    t.equal(cache.max, 100);
    cache.max = 2;
    t.same(cache.get('foo'), undefined);
    t.equal(cache.size, 0);

    cache.set('foo', 'bar');
    t.equal(cache.get('foo'), 'bar');
    t.equal(cache.size, 1);
    cache.set('bar', 'baz');
    t.equal(cache.get('foo'), 'bar');
    t.equal(cache.get('bar'), 'baz');
    t.equal(cache.size, 2);
    cache.set('baz', 'yada');
    t.same(cache.get('foo'), undefined);
    t.equal(cache.get('bar'), 'baz');
    t.equal(cache.get('baz'), 'yada');
    t.equal(cache.size, 2);
    cache.set('yada', '23');
    t.same(cache.get('foo'), undefined);
    t.same(cache.get('bar'), undefined);
    t.equal(cache.get('baz'), 'yada');
    t.equal(cache.get('yada'), '23');

    cache.max = 1;
    cache.set('one', '1');
    cache.set('two', '2');
    t.same(cache.get('foo'), undefined);
    t.same(cache.get('bar'), undefined);
    t.same(cache.get('baz'), undefined);
    t.same(cache.get('yada'), undefined);
    t.same(cache.get('one'), undefined);
    t.equal(cache.get('two'), '2');

    t.end();
  });

  t.test('Cache disabled', t => {
    const cache = new Cache();
    cache.max = 0;
    t.same(cache.get('foo'), undefined);
    cache.set('foo', 'bar');
    t.same(cache.get('foo'), undefined);
    t.equal(cache.size, 0);
    t.end();
  });

  t.end();
});
