import t from 'tap';
import Mime from '../lib/mime.js';

t.test('Types', t => {
  const mime = new Mime();
  t.equal(mime.extType('.txt'), 'text/plain;charset=UTF-8');
  t.equal(mime.extType('txt'), 'text/plain;charset=UTF-8');
  t.equal(mime.extType('.json'), 'application/json;charset=UTF-8');
  t.equal(mime.extType('json'), 'application/json;charset=UTF-8');
  t.equal(mime.extType('html'), 'text/html;charset=UTF-8');
  t.equal(mime.extType('css'), 'text/css');
  t.equal(mime.extType('xml'), 'application/xml');
  t.same(mime.extType('.unknown'), null);
  t.same(mime.extType('unknown'), null);
  t.equal(mime.extType('.html.ejs'), null);
  t.end();
});
