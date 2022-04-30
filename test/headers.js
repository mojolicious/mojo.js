import {Headers} from '../lib/headers.js';
import t from 'tap';

t.test('Headers', t => {
  t.test('Basics', t => {
    const headers = new Headers();
    t.same(headers.toObject(), {});
    t.same(headers.get('Foo'), null);
    t.same(headers.toArray(), []);

    const headers2 = new Headers(['Accept', 'text/plain']);
    t.same(headers2.toObject(), {Accept: 'text/plain'});
    t.equal(headers2.get('Accept'), 'text/plain');
    t.same(headers2.get('Foo'), null);
    headers2.set('Foo', 'bar');
    t.same(headers2.get('Foo'), 'bar');
    t.same(headers2.get('fOO'), 'bar');
    t.same(headers2.toObject(), {Accept: 'text/plain', Foo: 'bar'});
    t.same(headers2.toArray(), ['Accept', 'text/plain', 'Foo', 'bar']);
    headers2.set('Foo', 'yada');
    t.same(headers2.toArray(), ['Accept', 'text/plain', 'Foo', 'yada']);
    headers2.append('Foo', 'baz');
    t.same(headers2.toArray(), ['Accept', 'text/plain', 'Foo', 'yada, baz']);

    t.end();
  });

  t.test('Cookies', t => {
    const headers = new Headers();
    headers.append('Set-Cookie', 'one=foo');
    t.equal(headers.get('Set-Cookie'), 'one=foo');
    t.same(headers.getAll('Set-Cookie'), ['one=foo']);
    t.same(headers.toArray(), ['Set-Cookie', 'one=foo']);
    t.same(headers.toObject(), {'Set-Cookie': 'one=foo'});
    headers.append('Set-Cookie', 'two=bar');
    t.equal(headers.get('Set-Cookie'), 'one=foo, two=bar');
    t.same(headers.getAll('Set-Cookie'), ['one=foo', 'two=bar']);
    t.same(headers.toArray(), ['Set-Cookie', 'one=foo', 'Set-Cookie', 'two=bar']);
    t.same(headers.toObject(), {'Set-Cookie': 'one=foo, two=bar'});

    t.end();
  });

  t.end();
});
