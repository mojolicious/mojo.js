import {Mime} from '../lib/mime.js';
import t from 'tap';

t.test('MIME', t => {
  t.test('Types', t => {
    const mime = new Mime();
    t.equal(mime.extType('txt'), 'text/plain; charset=utf-8');
    t.equal(mime.extType('json'), 'application/json; charset=utf-8');
    t.equal(mime.extType('yaml'), 'text/yaml; charset=utf-8');
    t.equal(mime.extType('html'), 'text/html; charset=utf-8');
    t.equal(mime.extType('css'), 'text/css');
    t.equal(mime.extType('xml'), 'application/xml');
    t.same(mime.extType('.unknown'), null);
    t.same(mime.extType('unknown'), null);
    t.equal(mime.extType('html.tmpl'), null);
    t.end();
  });

  t.test('Detect common MIME types', t => {
    const mime = new Mime();
    t.same(mime.detect('application/atom+xml'), ['atom']);
    t.match(mime.detect('application/octet-stream'), ['bin']);
    t.same(mime.detect('text/css'), ['css']);
    t.same(mime.detect('image/gif'), ['gif']);
    t.same(mime.detect('application/gzip'), ['gz']);
    t.same(mime.detect('text/html'), ['html']);
    t.same(mime.detect('image/x-icon'), ['ico']);
    t.same(mime.detect('image/jpeg'), ['jpeg']);
    t.same(mime.detect('application/javascript'), ['js']);
    t.same(mime.detect('application/json'), ['json']);
    t.same(mime.detect('text/yaml'), ['yaml']);
    t.same(mime.detect('audio/mpeg'), ['mpga']);
    t.same(mime.detect('video/mp4'), ['mp4']);
    t.same(mime.detect('audio/ogg'), ['oga']);
    t.same(mime.detect('video/ogg'), ['ogv']);
    t.same(mime.detect('application/pdf'), ['pdf']);
    t.same(mime.detect('image/png'), ['png']);
    t.same(mime.detect('application/rss+xml'), ['rss']);
    t.same(mime.detect('image/svg+xml'), ['svg']);
    t.same(mime.detect('font/ttf'), ['ttf']);
    t.same(mime.detect('text/plain'), ['txt']);
    t.same(mime.detect('video/webm'), ['webm']);
    t.same(mime.detect('font/woff'), ['woff']);
    t.same(mime.detect('font/woff2'), ['woff2']);
    t.same(mime.detect('application/xml'), ['xml']);
    t.same(mime.detect('text/xml'), ['xml']);
    t.same(mime.detect('application/zip'), ['zip']);
    t.end();
  });

  t.test('Detect special cases', t => {
    const mime = new Mime();
    t.same(mime.detect(''), []);
    t.same(mime.detect('Application/Xml'), ['xml']);
    t.same(mime.detect(' Text/Xml '), ['xml']);
    t.same(mime.detect('APPLICATION/XML'), ['xml']);
    t.same(mime.detect('TEXT/XML'), ['xml']);
    t.same(mime.detect('text/html;q=0.9'), ['html']);
    t.same(mime.detect('TEXT/HTML;Q=0.9'), ['html']);
    t.end();
  });

  t.test('Alternatives', t => {
    const mime = new Mime();
    t.same(mime.detect('application/json'), ['json']);
    t.same(mime.detect('text/x-json'), []);
    t.same(mime.detect('APPLICATION/JsoN'), ['json']);
    t.same(mime.detect('text/html'), ['html']);
    t.equal(mime.extType('json'), 'application/json; charset=utf-8');
    t.equal(mime.extType('htm'), 'text/html');
    t.equal(mime.extType('html'), 'text/html; charset=utf-8');
    t.end();
  });

  t.test('Prioritize', t => {
    const mime = new Mime();
    t.same(mime.detect('text/plain'), ['txt']);
    t.same(mime.detect('text/plain,text/html'), ['txt', 'html']);
    t.same(mime.detect('TEXT/HTML; q=0.8 '), ['html']);
    t.same(mime.detect('TEXT/HTML  ;  q  =  0.8 '), ['html']);
    t.same(mime.detect('TEXT/HTML;Q=0.8,text/plain;Q=0.9'), ['txt', 'html']);
    t.same(mime.detect(' TEXT/HTML , text/plain;Q=0.9'), ['html', 'txt']);
    t.same(mime.detect('text/plain;q=0.5, text/xml, application/xml;q=0.1'), ['xml', 'txt', 'xml']);
    t.same(mime.detect('application/json, text/javascript, X/*; q=0.01'), ['json']);
    t.end();
  });

  t.test('Custom types', t => {
    const mime = new Mime();
    mime.custom.foo = 'application/foo';
    mime.custom.bar = 'text/bar; charset=utf-8';

    t.same(mime.detect('application/foo'), ['foo']);
    t.same(mime.detect('text/bar'), ['bar']);
    t.same(mime.detect('application/bar'), []);
    t.same(mime.detect('text/bar, font/woff, text/plain'), ['bar', 'woff', 'txt']);
    t.same(mime.detect('text/bar, font/woff; q=9, text/plain'), ['woff', 'bar', 'txt']);

    t.same(mime.extType('foo'), 'application/foo');
    t.same(mime.extType('bar'), 'text/bar; charset=utf-8');
    t.end();
  });

  t.end();
});
