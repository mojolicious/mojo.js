import http from 'node:http';
import mojo, {Server, UserAgent} from '../lib/core.js';
import {sleep} from '../lib/util.js';
import Path from '@mojojs/path';
import {captureOutput} from '@mojojs/util';
import t from 'tap';

t.test('UserAgent', async t => {
  const app = mojo();

  if (app.mode === 'development') app.log.level = 'debug';

  app.get('/hello', ctx => ctx.render({text: 'Hello World!'}));

  app.get('/status', ctx => {
    const test = ctx.req.query.get('test') ?? 'missing';
    ctx.res.set('X-Test', test);
    return ctx.render({text: '', status: parseInt(ctx.req.query.get('status'))});
  });

  app.get('/headers', ctx => {
    const name = ctx.req.query.get('header');
    const value = ctx.req.get(name) || 'fail';
    ctx.res.set('X-Test', 'works too');
    ctx.res.append('X-Test2', 'just').append('X-Test2', 'works').append('X-Test2', 'too');
    return ctx.render({text: value});
  });

  app.put('/body', async ctx => {
    const body = await ctx.req.text();
    return ctx.render({text: body});
  });

  app.post('/form', async ctx => {
    const form = await ctx.req.form();
    const foo = form.get('foo') ?? 'missing';
    const bar = form.get('bar') ?? 'missing';
    return ctx.render({text: `Form: ${foo}, ${bar}`});
  });

  app.get('/hello', {ext: 'json'}, ctx => ctx.render({json: {hello: 'world'}}));

  app.get('/hello', {ext: 'yaml'}, ctx => ctx.render({yaml: {hello: 'world'}}));

  app.any('/methods', ctx => ctx.render({text: ctx.req.method}));

  app.any('/test.html').to(ctx => ctx.render({text: '<div>Test<br>123</div>'}));

  app
    .any('/test.xml')
    .to(ctx => ctx.render({text: "<?xml version='1.0' encoding='UTF-8'?><script><p>Hello</p></script>"}));

  app.get('/auth/basic', async ctx => {
    const auth = ctx.req.userinfo ?? 'nothing';
    const body = (await ctx.req.text()) || 'nothing';
    return ctx.render({text: `basic: ${auth}, body: ${body}`});
  });

  app.post('/redirect/:code', async ctx => {
    const location = ctx.req.query.get('location');
    await ctx.res.status(ctx.stash.code).set('Location', location).send();
  });

  app.get('/redirect/again', ctx => ctx.redirectTo('hello'));

  app
    .get('/redirect/infinite/:num/:code', ctx => {
      const code = ctx.stash.code;
      const num = parseInt(ctx.stash.num) + 1;
      ctx.redirectTo('infinite', {status: code, values: {code, num}});
    })
    .name('infinite');

  app
    .any('/redirect/introspect', async ctx => {
      await ctx.render({
        json: {
          method: ctx.req.method,
          headers: {
            authorization: ctx.req.get('Authorization') ?? undefined,
            content: ctx.req.get('Content-Disposition') ?? undefined,
            cookie: ctx.req.get('Cookie') ?? undefined,
            referer: ctx.req.get('Referer') ?? undefined,
            test: ctx.req.get('X-Test') ?? undefined
          },
          body: await ctx.req.text()
        }
      });
    })
    .name('introspect');

  app.any('/redirect/introspect/:code', ctx => ctx.redirectTo('introspect', {status: ctx.stash.code}));

  app.get('/gzip', ctx => ctx.render({text: 'a'.repeat(2048)}));

  app.get('/abort', async () => {
    // Do nothing
  });

  const server = new Server(app, {listen: ['http://*'], quiet: true});
  await server.start();
  const ua = new UserAgent({baseURL: server.urls[0], name: 'mojo 1.0'});

  await t.test('Hello World', async t => {
    const res = await ua.get('/hello');
    t.equal(res.httpVersion, '1.1');
    t.equal(res.statusCode, 200);
    t.equal(res.statusMessage, 'OK');
    t.equal(await res.text(), 'Hello World!');
  });

  await t.test('Custom request', async t => {
    const res = await ua.request({url: '/hello'});
    t.equal(res.statusCode, 200);
    t.equal(await res.text(), 'Hello World!');

    const res2 = await ua.request({});
    t.equal(res2.statusCode, 404);
  });

  await t.test('Status', async t => {
    const res = await ua.get('/status?status=200');
    t.ok(res.isSuccess);
    t.not(res.isError);
    t.not(res.isClientError);
    t.not(res.isServerError);
    t.not(res.isRedirect);
    t.equal(res.statusCode, 200);
    t.equal(await res.text(), '');

    const res2 = await ua.get('/status?status=201');
    t.ok(res2.isSuccess);
    t.not(res2.isError);
    t.not(res2.isClientError);
    t.not(res2.isServerError);
    t.not(res2.isRedirect);
    t.equal(res2.statusCode, 201);
    t.equal(await res2.text(), '');

    const res3 = await ua.get('/status?status=302');
    t.not(res3.isSuccess);
    t.not(res3.isError);
    t.not(res3.isClientError);
    t.not(res3.isServerError);
    t.ok(res3.isRedirect);
    t.equal(res3.statusCode, 302);
    t.equal(await res3.text(), '');

    const res4 = await ua.get('/status?status=404');
    t.not(res4.isSuccess);
    t.ok(res4.isError);
    t.ok(res4.isClientError);
    t.not(res4.isServerError);
    t.not(res4.isRedirect);
    t.equal(res4.statusCode, 404);
    t.equal(await res4.text(), '');

    const res5 = await ua.get('/status?status=500');
    t.not(res5.isSuccess);
    t.ok(res5.isError);
    t.not(res5.isClientError);
    t.ok(res5.isServerError);
    t.not(res5.isRedirect);
    t.equal(res5.statusCode, 500);
    t.equal(await res5.text(), '');

    const res6 = await ua.get('/status?status=599');
    t.not(res6.isSuccess);
    t.ok(res6.isError);
    t.not(res6.isClientError);
    t.ok(res6.isServerError);
    t.not(res6.isRedirect);
    t.equal(res6.statusCode, 599);
    t.equal(await res6.text(), '');

    const res7 = await ua.get('/status?status=299');
    t.ok(res7.isSuccess);
    t.not(res7.isError);
    t.not(res7.isClientError);
    t.not(res7.isServerError);
    t.not(res7.isRedirect);
    t.equal(res7.statusCode, 299);
    t.equal(await res7.text(), '');
  });

  await t.test('Headers', async t => {
    const res = await ua.get('/headers?header=user-agent');
    t.equal(res.statusCode, 200);
    t.equal(res.get('X-Test'), 'works too');
    t.equal(res.get('X-Test2'), 'just, works, too');
    t.equal(await res.text(), 'mojo 1.0');

    const res2 = await ua.get('/headers?header=test', {headers: {test: 'works'}});
    t.equal(res2.statusCode, 200);
    t.equal(res2.get('X-Test'), 'works too');
    t.equal(res.get('X-Test2'), 'just, works, too');
    t.equal(await res2.text(), 'works');
  });

  await t.test('Body', async t => {
    const res = await ua.put('/body', {body: 'Body works!'});
    t.equal(res.statusCode, 200);
    t.equal(await res.text(), 'Body works!');

    const res2 = await ua.put('/body', {body: 'I ♥ Mojolicious!'});
    t.equal(res2.statusCode, 200);
    t.equal(await res2.text(), 'I ♥ Mojolicious!');

    const res3 = await ua.put('/body', {body: Buffer.from('I ♥ Mojolicious!')});
    t.equal(res3.statusCode, 200);
    t.equal((await res3.buffer()).toString(), 'I ♥ Mojolicious!');

    const res4 = await ua.put('/body', {body: 'I ♥ Mojolicious!'});
    t.equal(res4.statusCode, 200);
    const parts = [];
    for await (const chunk of res4) {
      parts.push(chunk);
    }
    t.equal(Buffer.concat(parts).toString(), 'I ♥ Mojolicious!');
  });

  await t.test('Query', async t => {
    const res = await ua.get('/headers', {query: {header: 'user-agent'}});
    t.equal(res.statusCode, 200);
    t.equal(res.get('X-Test'), 'works too');
    t.equal(await res.text(), 'mojo 1.0');

    const res2 = await ua.get('/status', {query: {status: 201, test: 'works'}});
    t.equal(res2.statusCode, 201);
    t.equal(res2.get('X-Test'), 'works');
    t.equal(await res2.text(), '');
  });

  await t.test('JSON', async t => {
    const res = await ua.get('/hello.json');
    t.equal(res.statusCode, 200);
    t.same(await res.json(), {hello: 'world'});
  });

  await t.test('YAML', async t => {
    const res = await ua.get('/hello.yaml');
    t.equal(res.statusCode, 200);
    t.same(await res.yaml(), {hello: 'world'});
  });

  await t.test('Form', async t => {
    const res = await ua.post('/form', {form: {foo: 'works'}});
    t.equal(res.statusCode, 200);
    t.equal(await res.text(), 'Form: works, missing');

    const res2 = await ua.post('/form', {form: {foo: 'works', bar: 'too'}});
    t.equal(res2.statusCode, 200);
    t.equal(await res2.text(), 'Form: works, too');

    const res3 = await ua.post('/form', {json: {foo: 'works', bar: 'too'}});
    t.equal(res3.statusCode, 200);
    t.equal(await res3.text(), 'Form: missing, missing');

    const res4 = await ua.post('/form', {form: {foo: 'w(o-&2F%2F)r k  s', bar: '%&!@#$%^&*&&%'}});
    t.equal(res4.statusCode, 200);
    t.equal(await res4.text(), 'Form: w(o-&2F%2F)r k  s, %&!@#$%^&*&&%');
  });

  await t.test('Methods', async t => {
    const res = await ua.delete('/methods');
    t.equal(res.statusCode, 200);
    t.equal(await res.text(), 'DELETE');

    const res2 = await ua.get('/methods');
    t.equal(res2.statusCode, 200);
    t.equal(await res2.text(), 'GET');

    const res3 = await ua.options('/methods');
    t.equal(res3.statusCode, 200);
    t.equal(await res3.text(), 'OPTIONS');

    const res4 = await ua.patch('/methods');
    t.equal(res4.statusCode, 200);
    t.equal(await res4.text(), 'PATCH');

    const res5 = await ua.post('/methods');
    t.equal(res5.statusCode, 200);
    t.equal(await res5.text(), 'POST');

    const res6 = await ua.put('/methods');
    t.equal(res6.statusCode, 200);
    t.equal(await res6.text(), 'PUT');

    const res7 = await ua.head('/hello');
    t.equal(res7.statusCode, 200);
    t.equal(res7.get('Content-Length'), '12');
    t.equal(await res7.text(), '');

    const res8 = await ua.request({method: 'PUT', url: '/methods'});
    t.equal(res8.statusCode, 200);
    t.equal(await res8.text(), 'PUT');
  });

  await t.test('Streams', async t => {
    const res = await ua.put('/body', {body: 'Hello Mojo!'});
    t.equal(res.statusCode, 200);
    const dir = await Path.tempDir();
    const file = await dir.child('hello.txt').touch();
    const stream = file.createWriteStream();
    await res.pipe(stream);
    t.equal(stream.bytesWritten, 11);
    t.equal(await file.readFile('utf8'), 'Hello Mojo!');

    const res2 = await ua.put('/body', {body: file.createReadStream()});
    t.equal(res2.statusCode, 200);
    t.equal(await res2.text(), 'Hello Mojo!');
  });

  await t.test('Basic authentication', async t => {
    const res = await ua.get('/auth/basic', {auth: 'foo:bar'});
    t.equal(res.statusCode, 200);
    t.equal(await res.text(), 'basic: foo:bar, body: nothing');

    const res2 = await ua.get('/auth/basic');
    t.equal(res2.statusCode, 200);
    t.equal(await res2.text(), 'basic: nothing, body: nothing');

    const res3 = await ua.get('/auth/basic', {auth: 'foo:bar:baz', body: 'test'});
    t.equal(res3.statusCode, 200);
    t.equal(await res3.text(), 'basic: foo:bar:baz, body: test');

    const url = new URL('/auth/basic', ua.baseURL);
    url.username = 'foo@example.com';
    url.password = 'bar';
    const res4 = await ua.get(url);
    t.equal(res4.statusCode, 200);
    t.equal(await res4.text(), 'basic: foo@example.com:bar, body: nothing');
  });

  await t.test('Hooks', async t => {
    ua.addHook('request', async (ua, config) => {
      await sleep(10);
      config.url.searchParams.append('status', 201);
    });

    const res = await ua.get('/status');
    t.equal(res.statusCode, 201);
    t.equal(await res.text(), '');

    const res2 = await ua.get('/status');
    t.equal(res2.statusCode, 201);
    t.equal(await res2.text(), '');
  });

  await t.test('Custom agent', async t => {
    const keepAlive = new http.Agent({keepAlive: true});
    const noKeepAlive = new http.Agent({keepAlive: false});

    const res = await ua.get('/hello', {agent: noKeepAlive});
    t.equal(res.statusCode, 200);
    t.equal(res.get('Connection'), 'close');
    t.equal(await res.text(), 'Hello World!');

    const res2 = await ua.get('/hello', {agent: keepAlive});
    t.equal(res2.statusCode, 200);
    t.equal(res2.get('Connection'), 'keep-alive');
    t.equal(await res2.text(), 'Hello World!');
    keepAlive.destroy();

    ua.httpTransport.agent = keepAlive;
    const res3 = await ua.get('/hello');
    t.equal(res3.statusCode, 200);
    t.equal(res3.get('Connection'), 'keep-alive');
    t.equal(await res3.text(), 'Hello World!');
    await ua.destroy();

    ua.httpTransport.agent = noKeepAlive;
    const res4 = await ua.get('/hello');
    t.equal(res4.statusCode, 200);
    t.equal(res4.get('Connection'), 'close');
    t.equal(await res4.text(), 'Hello World!');
  });

  await t.test('Keep-alive', async t => {
    const ua = await app.newMockUserAgent({}, {maxRequestsPerSocket: 2});
    const keepAlive = new http.Agent({keepAlive: true});

    const res = await ua.get('/hello', {agent: keepAlive});
    t.equal(res.statusCode, 200);
    t.equal(res.get('Connection'), 'keep-alive');
    t.equal(await res.text(), 'Hello World!');
    const res2 = await ua.get('/hello', {agent: keepAlive});
    t.equal(res2.statusCode, 200);
    t.equal(res2.get('Connection'), 'close');
    t.equal(await res2.text(), 'Hello World!');

    keepAlive.destroy();
    await ua.stop();
  });

  await t.test('Redirect', async t => {
    const hello = new URL('/hello', ua.baseURL);
    const res = await ua.post('/redirect/301', {query: {location: hello.toString()}});
    t.equal(res.statusCode, 301);
    t.equal(res.get('Location'), hello.toString());
    t.equal(await res.text(), '');

    ua.maxRedirects = 1;
    const res2 = await ua.post('/redirect/301', {query: {location: hello.toString()}});
    t.equal(res2.statusCode, 200);
    t.same(res2.get('Location'), undefined);
    t.equal(await res2.text(), 'Hello World!');

    const res3 = await ua.post('/redirect/302', {query: {location: hello.toString()}});
    t.equal(res3.statusCode, 200);
    t.same(res3.get('Location'), undefined);
    t.equal(await res3.text(), 'Hello World!');

    const res4 = await ua.post('/redirect/303', {query: {location: hello.toString()}});
    t.equal(res4.statusCode, 200);
    t.same(res4.get('Location'), undefined);
    t.equal(await res4.text(), 'Hello World!');

    const res5 = await ua.post('/redirect/333', {query: {location: hello.toString()}});
    t.equal(res5.statusCode, 333);
    t.equal(res5.get('Location'), hello.toString());
    t.equal(await res5.text(), '');

    const again = new URL('/redirect/again', ua.baseURL);
    const res6 = await ua.post('/redirect/301', {query: {location: again.toString()}});
    t.equal(res6.statusCode, 302);
    t.equal(res6.get('Location'), hello.toString());
    t.equal(await res6.text(), '');

    ua.maxRedirects = 2;
    const res7 = await ua.post('/redirect/301', {query: {location: again.toString()}});
    t.equal(res7.statusCode, 200);
    t.same(res7.get('Location'), undefined);
    t.equal(await res7.text(), 'Hello World!');

    ua.maxRedirects = 5;
    const res8 = await ua.get('/redirect/infinite/0/302');
    t.equal(res8.statusCode, 302);
    t.match(res8.get('Location'), /\/infinite\/6/);
    t.equal(await res8.text(), '');

    const res9 = await ua.get('/redirect/infinite/0/307');
    t.equal(res9.statusCode, 307);
    t.match(res9.get('Location'), /\/infinite\/6/);
    t.equal(await res9.text(), '');
    ua.maxRedirects = 0;
  });

  await t.test('Redirect (header removal)', async t => {
    function defaultOptions() {
      return {
        headers: {
          Authorization: 'one',
          Cookie: 'two',
          Referer: 'three',
          'Content-Disposition': 'four',
          'X-Test': 'five'
        },
        body: 'works'
      };
    }

    ua.maxRedirects = 3;
    const res = await ua.put('/redirect/introspect', defaultOptions());
    t.equal(res.statusCode, 200);
    t.same(await res.json(), {
      method: 'PUT',
      headers: {
        authorization: 'one',
        content: 'four',
        cookie: 'two',
        referer: 'three',
        test: 'five'
      },
      body: 'works'
    });

    const res2 = await ua.put('/redirect/introspect/301', defaultOptions());
    t.equal(res2.statusCode, 200);
    t.same(await res2.json(), {method: 'PUT', headers: {test: 'five'}, body: ''});

    const res3 = await ua.put('/redirect/introspect/302', defaultOptions());
    t.equal(res3.statusCode, 200);
    t.same(await res3.json(), {method: 'PUT', headers: {test: 'five'}, body: ''});

    const res4 = await ua.put('/redirect/introspect/303', defaultOptions());
    t.equal(res4.statusCode, 200);
    t.same(await res4.json(), {method: 'GET', headers: {test: 'five'}, body: ''});

    const res5 = await ua.put('/redirect/introspect/307', defaultOptions());
    t.equal(res5.statusCode, 200);
    t.same(await res5.json(), {method: 'PUT', headers: {content: 'four', test: 'five'}, body: 'works'});

    const res6 = await ua.put('/redirect/introspect/308', defaultOptions());
    t.equal(res6.statusCode, 200);
    t.same(await res6.json(), {method: 'PUT', headers: {content: 'four', test: 'five'}, body: 'works'});

    const res7 = await ua.post('/redirect/introspect/302', defaultOptions());
    t.equal(res7.statusCode, 200);
    t.same(await res7.json(), {method: 'GET', headers: {test: 'five'}, body: ''});
  });

  await t.test('HTML/XML', async t => {
    const res = await ua.get('/test.html');
    const html = await res.html();
    t.equal(html.at('div').text(), 'Test123');

    const res2 = await ua.get('/test.xml');
    const xml = await res2.xml();
    t.equal(xml.find('script p').length, 1);
    t.equal(xml.at('script p').text(), 'Hello');

    const res3 = await ua.get('/test.xml');
    const html2 = await res3.html();
    t.same(html2.at('script p'), null);
  });

  await t.test('Decompression', async t => {
    const res = await ua.get('/gzip');
    t.equal(res.statusCode, 200);
    t.not(res.get('content-length'), '2048');
    t.equal(res.get('content-encoding'), 'gzip');
    t.equal(res.get('vary'), 'Accept-Encoding');
    t.equal(await res.text(), 'a'.repeat(2048));

    const res2 = await ua.get('/gzip');
    res2.autoDecompress = false;
    t.equal(res2.statusCode, 200);
    t.not(res2.get('content-length'), '2048');
    t.equal(res2.get('content-encoding'), 'gzip');
    t.equal(res2.get('vary'), 'Accept-Encoding');
    t.not(await res2.text(), 'a'.repeat(2048));

    const res3 = await ua.get('/gzip', {headers: {'Accept-Encoding': 'nothing'}});
    t.equal(res3.statusCode, 200);
    t.equal(res3.get('content-length'), '2048');
    t.not(res3.get('content-encoding'), 'gzip');
    t.equal(res3.get('vary'), 'Accept-Encoding');
    t.equal(await res3.text(), 'a'.repeat(2048));

    const res4 = await ua.get('/gzip');
    const dir = await Path.tempDir();
    const file = await dir.child('hello.txt').touch();
    await res4.pipe(file.createWriteStream());
    t.equal(await file.readFile('utf8'), 'a'.repeat(2048));

    const res5 = await ua.get('/gzip');
    const parts = [];
    for await (const chunk of res5) {
      parts.push(chunk);
    }
    t.equal(Buffer.concat(parts).toString(), 'a'.repeat(2048));
  });

  const skip = parseInt(process.versions.node.split('.')[0]) > 16 ? {} : {skip: 'Timeouts require Node.js 18'};
  await t.test('Abort', skip, async t => {
    const ac = new AbortController();
    const {signal} = ac;
    setTimeout(() => ac.abort(), 100);

    let result;
    try {
      await ua.get('/abort', {signal});
    } catch (error) {
      result = error;
    }

    t.match(result, /aborted/);
  });

  await t.test('MOJO_CLIENT_DEBUG', async t => {
    process.env.MOJO_CLIENT_DEBUG = 1;
    const ua = await app.newMockUserAgent();

    let res;
    const output = await captureOutput(
      async () => {
        res = await ua.get('/hello');
      },
      {stderr: true, stdout: false}
    );
    t.equal(res.statusCode, 200);
    t.equal(await res.text(), 'Hello World!');
    t.match(output, /Client <<< Server/);
    t.match(output, /GET \/hello/);
    t.match(output, /Host: /);
    t.match(output, /Client >>> Server/);
    t.match(output, /Content-Length: /);
    t.match(output, /Hello World!/);

    await ua.stop();
  });

  await server.stop();
});
