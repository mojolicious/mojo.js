import mojo from '../lib/mojo.js';
import t from 'tap';

t.test('Server', async t => {
  t.test('listenArgsforURL', t => {
    t.same(mojo.Server.listenArgsForURL(new URL('http://*')), [null, '0.0.0.0']);
    t.same(mojo.Server.listenArgsForURL(new URL('http://*:3000')), [3000, '0.0.0.0']);
    t.same(mojo.Server.listenArgsForURL(new URL('http://*:4000')), [4000, '0.0.0.0']);
    t.same(mojo.Server.listenArgsForURL(new URL('http://0.0.0.0:8000')), [8000, '0.0.0.0']);
    t.same(mojo.Server.listenArgsForURL(new URL('http://127.0.0.1:8080')), [8080, '127.0.0.1']);

    t.same(mojo.Server.listenArgsForURL(new URL('http://*?fd=3')), [{fd: 3}]);
    t.same(mojo.Server.listenArgsForURL(new URL('http://[::1]:5000')), [5000, '::1']);

    t.end();
  });
});
