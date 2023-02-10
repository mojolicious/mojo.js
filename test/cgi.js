import {Stream} from 'node:stream';
import mojo, {CGI} from '../lib/core.js';
import * as util from '../lib/util.js';
import {captureOutput} from '@mojojs/util';
import t from 'tap';

t.test('CGI', async t => {
  const app = mojo({mode: 'production'});

  app.config.serverHooks = 'works';

  const serverHooks = [];
  app.addAppHook('server:start', async app => {
    await util.sleep(1);
    serverHooks.push(`start: ${app.config.serverHooks}`);
  });
  app.addAppHook('server:stop', async app => {
    await util.sleep(1);
    serverHooks.push(`stop: ${app.config.serverHooks}`);
  });

  app.addContextHook('dispatch:before', async ctx => {
    ctx.res.set('X-Name', ctx.backend.name);
  });

  app.get('/', ctx => ctx.render({text: 'Hello World!'}));

  app.get('/stream', async ctx => {
    await ctx.res.length(13).send(Stream.Readable.from(['Hello', ' Stream!']));
  });

  await t.test('Minimal request', async t => {
    const env = process.env;
    process.env = {PATH_INFO: '/'};

    const output = await captureOutput(
      async () => {
        await new CGI(app).run();
      },
      {stderr: true, stdout: true}
    );

    process.env = env;

    t.same(serverHooks, ['start: works', 'stop: works']);
    t.match(output, /Content-Length: 12/);
    t.match(output, /Content-Type: text\/plain; charset=utf-8/);
    t.match(output, /X-Name: cgi/);
    t.match(output, /Status: 200 OK/);
    t.match(output, /Hello World!/);
  });

  await t.test('Empty environment', async t => {
    const env = process.env;
    process.env = {};

    const output = await captureOutput(
      async () => {
        await new CGI(app).run();
      },
      {stderr: true, stdout: true}
    );

    process.env = env;

    t.match(output, /Content-Length: 12/);
    t.match(output, /Content-Type: text\/plain; charset=utf-8/);
    t.match(output, /Status: 200 OK/);
    t.match(output, /Hello World!/);
  });

  await t.test('Stream response', async t => {
    const env = process.env;
    process.env = {PATH_INFO: '/stream'};

    const output = await captureOutput(
      async () => {
        await new CGI(app).run();
      },
      {stderr: true, stdout: true}
    );

    process.env = env;

    t.match(output, /Content-Length: 13/);
    t.match(output, /Status: 200 OK/);
    t.match(output, /Hello Stream!/);
  });

  await t.test('Not found', async t => {
    const env = process.env;
    process.env = {PATH_INFO: '/missing'};

    const output = await captureOutput(
      async () => {
        await new CGI(app).run();
      },
      {stderr: true, stdout: true}
    );

    process.env = env;

    t.match(output.toString(), /Status: 404 Not Found.+Page Not Found/s);
  });

  await t.test('Parse Lighttpd CGI environment variables', async t => {
    const res = CGI.envToRequest(
      {
        HTTP_CONTENT_LENGTH: '11',
        HTTP_DNT: '1',
        PATH_INFO: '/te+st/index.cgi/foo/bar',
        QUERY_STRING: 'lalala=23&bar=baz',
        REQUEST_METHOD: 'POST',
        SCRIPT_NAME: '/te+st/index.cgi',
        HTTP_HOST: 'localhost:8080',
        SERVER_PROTOCOL: 'HTTP/1.0'
      },
      Stream.Readable.from(['Hello', ' World'])
    );

    t.equal(res.method, 'POST');
    t.equal(res.url, '/foo/bar?lalala=23&bar=baz');
    t.equal(res.baseURL, 'http://localhost:8080');
    t.equal(res.get('Content-Length'), '11');
    t.equal(res.get('DNT'), '1');
    t.equal(await res.text(), 'Hello World');
  });

  await t.test('Parse Apache CGI environment variables with basic authentication', async t => {
    const res = CGI.envToRequest(
      {
        CONTENT_LENGTH: '11',
        HTTP_Authorization: 'Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==',
        HTTP_Proxy_Authorization: 'Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==',
        CONTENT_TYPE: 'application/x-www-form-urlencoded',
        HTTP_DNT: '1',
        PATH_INFO: '/test/index.cgi/foo/bar',
        QUERY_STRING: 'lalala=23&bar=baz',
        REQUEST_METHOD: 'PATCH',
        SCRIPT_NAME: '/test/index.cgi',
        HTTP_HOST: 'localhost:8080',
        SERVER_PROTOCOL: 'HTTP/1.0'
      },
      Stream.Readable.from(['hello=world'])
    );

    t.equal(res.method, 'PATCH');
    t.equal(res.url, '/foo/bar?lalala=23&bar=baz');
    t.equal(res.baseURL, 'http://localhost:8080');
    t.equal(res.userinfo, 'Aladdin:open sesame');
    t.equal(res.get('Content-Length'), '11');
    t.equal(res.get('DNT'), '1');
    t.equal(res.query.get('lalala'), '23');
    t.equal(res.query.get('bar'), 'baz');
    t.equal((await res.form()).get('hello'), 'world');
  });

  t.test('Parse Apache 2.2.11 CGI environment variables (HTTPS=ON)', t => {
    const res = CGI.envToRequest(
      {
        CONTENT_LENGTH: '11',
        CONTENT_TYPE: 'application/x-www-form-urlencoded',
        PATH_INFO: '/foo/bar',
        QUERY_STRING: '',
        REQUEST_METHOD: 'GET',
        SCRIPT_NAME: '/test/index.cgi',
        HTTP_HOST: 'localhost',
        HTTPS: 'ON',
        SERVER_PROTOCOL: 'HTTP/1.0'
      },
      process.stdin
    );

    t.equal(res.method, 'GET');
    t.equal(res.url, '/foo/bar');
    t.equal(res.baseURL, 'https://localhost');
    t.equal(res.get('Content-Length'), '11');

    t.end();
  });

  t.test('Parse Apache 2.2.11 CGI environment variables (trailing slash)', t => {
    const res = CGI.envToRequest(
      {
        CONTENT_LENGTH: '11',
        CONTENT_TYPE: 'application/x-www-form-urlencoded',
        PATH_INFO: '/foo/bar/',
        QUERY_STRING: '',
        REQUEST_METHOD: 'GET',
        SCRIPT_NAME: '/test/index.cgi',
        HTTP_HOST: 'localhost',
        SERVER_PROTOCOL: 'HTTP/1.0'
      },
      process.stdin
    );

    t.equal(res.method, 'GET');
    t.equal(res.url, '/foo/bar/');
    t.equal(res.baseURL, 'http://localhost');
    t.equal(res.get('Content-Length'), '11');

    t.end();
  });

  t.test('Parse IIS 7.5 like CGI environment (HTTPS=off)', t => {
    const res = CGI.envToRequest(
      {
        CONTENT_LENGTH: '0',
        PATH_INFO: '/index.pl/',
        SERVER_SOFTWARE: 'Microsoft-IIS/7.5',
        QUERY_STRING: '',
        REQUEST_METHOD: 'GET',
        SCRIPT_NAME: '/index.pl',
        HTTP_HOST: 'test',
        HTTPS: 'off',
        SERVER_PROTOCOL: 'HTTP/1.1'
      },
      process.stdin
    );

    t.equal(res.method, 'GET');
    t.equal(res.url, '/');
    t.equal(res.baseURL, 'http://test');
    t.equal(res.get('Content-Length'), '0');

    t.end();
  });
});
