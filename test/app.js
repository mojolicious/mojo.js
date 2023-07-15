import {Stream} from 'node:stream';
import mojo, {Session} from '../lib/core.js';
import {SafeString} from '@mojojs/util';
import t from 'tap';

t.test('App', async t => {
  const app = mojo();

  t.equal(app.log.level, 'trace');
  app.log.level = 'fatal';

  app.config.appName = 'Test';
  app.models.test = {it: 'works'};

  app.defaults.whatever = 'works';

  app.validator.addSchema(
    {
      type: 'object',
      properties: {
        username: {type: 'string'}
      },
      required: ['username']
    },
    'user'
  );

  // GET /
  app.get('/', ctx => ctx.render({text: 'Hello Mojo!'})).name('root-route');

  // GET /☃
  app.get('/☃', ctx => ctx.render({text: 'Hello Snowman!'}));

  // * /methods
  app.any('/methods', ctx => ctx.render({text: ctx.req.method}));

  // * /method/override
  const override = app.any('/method/override');
  override.put(ctx => ctx.render({text: 'PUT'}));
  override.post(ctx => ctx.render({text: 'POST'}));
  override.any(ctx => ctx.render({text: 'Unhandled'}));

  // PUT /json
  app.put('/json', async ctx => ctx.render({json: await ctx.req.json()}));

  // PUT /yaml
  app.put('/yaml', async ctx => ctx.render({yaml: await ctx.req.yaml()}));

  // GET /inline
  app.get('/inline', async ctx => ctx.render({inline: '<%= whatever %>'}));

  // GET /nested
  // *   /nested/methods
  const nested = app.under('/nested').to(async ctx => {
    if (ctx.req.query.get('auth') === '1') return;
    await ctx.render({text: 'Permission denied'});
    return false;
  });
  nested.get('/').to(ctx => ctx.render({text: 'Authenticated'}));
  const test = nested.any('/test').to({prefix: 'X:'});
  test.any('/methods').to(ctx => ctx.render({text: ctx.stash.prefix + ctx.req.method}));

  // * /status
  app.any('/status', async ctx => {
    await ctx.res.status(289, 'Whatever').send('Custom status');
  });

  // * /exception/*
  app
    .any('/exception/:msg', ctx => {
      throw new Error(`Something went wrong: ${ctx.stash.msg}`);
    })
    .name('exception');

  // * /config
  app.any('/config').to(ctx => ctx.render({text: `${ctx.config.appName} ${ctx.models.test.it}`}));

  // * /request_id
  app.any('/request_id').to(ctx => ctx.render({text: ctx.req.requestId}));

  // DELETE /
  app.delete('/', ctx => ctx.render({text: 'Delete'}));

  // PATCH /
  app.patch('/', ctx => ctx.render({text: 'Patch'}));

  // OPTIONS /
  app.options('/', ctx => ctx.render({text: 'Options'}));

  // POST /
  app.post('/', async ctx => {
    await ctx.render({text: 'Post'});
    await ctx.render({text: 'failed!'});
  });

  // GET /custom/request_id
  const custom = app.under(ctx => (ctx.req.requestId = '123'));
  custom.get('/custom/request_id').to(ctx => ctx.render({text: ctx.req.requestId}));

  // GET /cookie
  app.get('/cookie', ctx => {
    const foo = ctx.req.getCookie('foo') ?? 'not present';
    if (foo === 'not present') ctx.res.setCookie('foo', 'present');
    return ctx.render({text: `Cookie: ${foo}`});
  });

  // GET /session/login/*
  app.get('/session/login/:name', async ctx => {
    const session = await ctx.session();
    session.user = ctx.stash.name;
    return ctx.render({text: `Login: ${ctx.stash.name}`});
  });

  // GET /session/members
  app.get('/session/members', async ctx => {
    const session = await ctx.session();
    const user = session.user ?? 'not logged in';
    const extra = ctx.req.getCookie('mojo-extra') ?? 'no extra cookie';
    ctx.res.setCookie('mojo-extra', 'with extra cookie');
    return ctx.render({text: `Member: ${user}, ${extra}`});
  });

  // GET /session/update/*
  app.get('/session/update/:name', async ctx => {
    const session = await ctx.session();
    session.user = ctx.stash.name;
    return ctx.render({text: `Update: ${session.user}`});
  });

  // GET /session/logout
  app.get('/session/logout', async ctx => {
    const session = await ctx.session();
    session.expires = 1;
    return ctx.render({text: `Logout: ${session.user}`});
  });

  // GET /session/expiration
  app.get('/session/expiration', async ctx => {
    const params = await ctx.params();
    const session = await ctx.session();

    const expiration = params.get('expiration');
    if (expiration !== null) {
      session.expiration = parseInt(expiration);
      session.value = 'works';
      return ctx.redirectTo('session_expiration');
    }

    await ctx.render({text: `expiration: ${session.expiration ?? 'none'}, value: ${session.value ?? 'none'}`});
  });

  // GET /flash
  app.get('/flash', async ctx => {
    const flash = await ctx.flash();
    const params = await ctx.params();
    const message = params.get('message');
    if (message !== null) flash.message = message;
    return ctx.render({text: `Flash: ${flash.message ?? 'none'}`});
  });

  // GET /flash/two
  app.get('/flash/two', async ctx => {
    const flash = await ctx.flash();

    flash.first = 'one';
    flash.second = 'two';

    const first = flash.first ?? 'nothing';
    const second = flash.second ?? 'nothing';

    await ctx.render({text: `first: ${first}, second: ${second}`});
  });

  // GET /chunked
  app.get('/chunked', async ctx => {
    ctx.res.set('Transfer-Encoding', 'chunked');
    await ctx.res.send(Stream.Readable.from(['Hello', ' World!']));
  });

  // GET /ua
  app.get('/ua', async ctx => {
    const res = await ctx.ua.get(ua.server.urls[0] + 'config');
    return ctx.render({text: await res.text()});
  });

  // POST /form/data
  app.post('/form/data', async ctx => {
    const form = await ctx.req.form();
    const data = {first: form.get('first') ?? 'missing', second: form.get('second') ?? 'missing'};
    return ctx.render({json: data});
  });

  // POST /form/mixed
  app.post('/form/mixed', async ctx => {
    const params = await ctx.params({notEmpty: true});

    const data = {
      one: params.get('one') ?? 'missing',
      two: params.get('two') ?? 'missing',
      three: params.get('three') ?? 'missing'
    };

    return ctx.render({json: data});
  });

  // POST /form/upload
  app.post('/form/upload', async ctx => {
    const uploads = [];
    for await (const {fieldname, file, filename} of ctx.req.files({limits: {fileSize: 10}})) {
      const upload = {fieldname, filename};
      uploads.push(upload);

      const parts = [];
      for await (const chunk of file) {
        parts.push(chunk);
      }
      upload.content = Buffer.concat(parts).toString();
      upload.limit = file.truncated;
    }

    const params = await ctx.req.form();

    return ctx.render({json: {uploads, params: params.toObject()}});
  });

  // * /url_for
  app.any('/url_for/:msg').to({msg: 'fail'}, async ctx => {
    const form = await ctx.req.form();
    const target = form.get('target');
    const values = form.has('msg') ? {msg: form.get('msg')} : undefined;
    return ctx.render({text: ctx.urlFor(target, {values})});
  });
  app.any('/websocket').websocket('/route').any('/works').name('websocket_route');

  // * /redirect
  app.any('/redirect', async ctx => {
    const form = await ctx.req.form();
    const options = form.has('status') ? {status: form.get('status')} : undefined;
    ctx.redirectTo(form.get('target'), options);
  });

  // PUT /maybe
  app.put('/maybe', async ctx => {
    const options = await ctx.req.json();
    if ((await ctx.render({...options})) === false) ctx.render({text: 'Fallback'});
  });

  // GET /res
  app.get('/res', async ctx => ctx.res.status(200).send('Hello World!'));

  // GET /content/negotiation
  // GET /content/negotiation.html
  // GET /content/negotiation.json
  app
    .get('/content/negotiation', {ext: ['html', 'json']}, async ctx => {
      await ctx.respondTo({
        html: ctx => ctx.render({text: 'Some HTML', format: 'html'}),
        json: ctx => ctx.render({json: {some: 'JSON'}})
      });
    })
    .to({ext: null});

  // GET /content/negotiation/fallback
  app.get('/content/negotiation/fallback', async ctx => {
    await ctx.respondTo({
      any: {text: 'Fallback'},
      json: {json: {just: 'JSON'}}
    });
  });

  // GET /accepts
  app.get('/accepts', {ext: ['txt']}).to({
    ext: null,
    fn: async ctx => {
      const allowed = (await ctx.req.json()) ?? undefined;
      await ctx.render({json: {accepts: ctx.accepts(allowed)}});
    }
  });

  // GET /ip
  app.get('/ip', ctx => ctx.render({text: `Address: ${ctx.req.ip}`}));

  // GET /protocol
  app.get('/protocol', ctx => ctx.render({text: `Protocol: ${ctx.req.protocol}`}));

  // PUT /schema/user
  app.put('/schema/user', async ctx => {
    const validate = ctx.schema('user');
    const data = await ctx.req.json();
    const result = validate(data);
    await ctx.render({json: {valid: result.isValid}});
  });

  // PUT /schema/form
  app.put('/schema/form', async ctx => {
    const validate = ctx.schema({
      type: 'object',
      properties: {
        test: {type: 'string'}
      },
      required: ['test']
    });

    const params = await ctx.params();
    const result = validate(params.toObject());

    await ctx.render({json: {valid: result.isValid}});
  });

  // PUT /schema/dynamic
  app.put('/schema/dynamic', async ctx => {
    const validate = ctx.schema({
      $id: 'test123',
      type: 'object',
      properties: {
        test: {type: 'number'}
      },
      required: ['test']
    });

    const data = await ctx.req.json();
    const result = validate(data);

    await ctx.render({json: {valid: result.isValid, errors: result.errors}});
  });

  // PUT /schema/array
  app.put('/schema/array', async ctx => {
    const validate = ctx.schema({
      type: 'object',
      properties: {
        test: {type: 'array'}
      },
      required: ['test']
    });

    const data = await ctx.req.json();
    const result = validate(data);

    await ctx.render({json: {valid: result.isValid, errors: result.errors, data: data}});
  });

  // GET /gzip
  app.get('/gzip', ctx => ctx.render({text: 'a'.repeat(2048)}));

  // GET /read-twice (body consumed twice)
  app.post('/read-twice', async ctx => {
    ctx.log.debug(await ctx.req.text());
    await ctx.render({json: await ctx.req.json()});
  });

  const ua = await app.newTestUserAgent({tap: t});

  t.test('Options', t => {
    const app = mojo();
    t.same(app.config, {});
    t.equal(app.exceptionFormat, 'html');
    t.equal(app.mode, 'development');
    t.same(app.secrets, ['Insecure']);

    const app2 = mojo({config: {it: 'works'}, exceptionFormat: 'json', mode: 'production', secrets: ['Secure']});
    t.same(app2.config, {it: 'works'});
    t.equal(app2.exceptionFormat, 'json');
    t.equal(app2.mode, 'production');
    t.same(app2.secrets, ['Secure']);
    t.end();
  });

  await t.test('Hello World', async () => {
    t.equal(app.router.cache.size, 0);
    (await ua.getOk('/')).statusIs(200).headerIs('Content-Length', '11').bodyIs('Hello Mojo!');
    t.equal(app.router.cache.size, 1);
    (await ua.getOk('/')).statusIs(200).headerLike('Content-Length', /1/).bodyLike(/Mojo/);
    t.equal(app.router.cache.size, 1);
  });

  await t.test('IRI', async () => {
    const logs = app.log.capture('trace');
    (await ua.getOk('/☃')).statusIs(200).bodyIs('Hello Snowman!');
    logs.stop();
    t.match(logs.toString(), /[trace].+GET "\/☃"/);
    t.match(logs.toString(), /[trace].+Routing to function/);
    t.match(logs.toString(), /[trace].+Rendering text response/);
  });

  await t.test('Methods', async () => {
    (await ua.deleteOk('/methods')).statusIs(200).bodyIs('DELETE');
    (await ua.getOk('/methods')).statusIs(200).bodyIs('GET');
    (await ua.headOk('/methods')).statusIs(200).bodyIs('');
    (await ua.optionsOk('/methods')).statusIs(200).bodyIs('OPTIONS');
    (await ua.patchOk('/methods')).statusIs(200).bodyIs('PATCH');
    (await ua.postOk('/methods')).statusIs(200).bodyIs('POST');
    (await ua.putOk('/methods')).statusIs(200).bodyIs('PUT');

    (await ua.deleteOk('/')).statusIs(200).bodyIs('Delete');
    (await ua.patchOk('/')).statusIs(200).bodyIs('Patch');
    (await ua.optionsOk('/')).statusIs(200).bodyIs('Options');
    (await ua.postOk('/')).statusIs(200).bodyIs('Post');
  });

  await t.test('Method overrides', async () => {
    (await ua.getOk('/method/override?_method=POST')).statusIs(200).bodyIs('Unhandled');
    (await ua.getOk('/method/override?_method=PUT')).statusIs(200).bodyIs('Unhandled');
    (await ua.deleteOk('/method/override?_method=PUT')).statusIs(200).bodyIs('Unhandled');
    (await ua.postOk('/method/override?_method=DELETE')).statusIs(200).bodyIs('Unhandled');

    (await ua.postOk('/method/override?_method=PUT')).statusIs(200).bodyIs('PUT');
    (await ua.postOk('/method/override?_method=POST')).statusIs(200).bodyIs('POST');
    (await ua.postOk('/method/override')).statusIs(200).bodyIs('POST');

    (await ua.putOk('/method/override?_method=DELETE')).statusIs(200).bodyIs('PUT');
  });

  await t.test('JSON', async () => {
    (await ua.putOk('/json', {json: {hello: 'world'}})).statusIs(200).jsonIs({hello: 'world'});
    (await ua.putOk('/json', {json: {i: ['♥ mojo']}})).statusIs(200).jsonIs({i: ['♥ mojo']});
    (await ua.putOk('/json', {json: {i: ['♥ mojo']}})).statusIs(200).jsonIs('♥ mojo', '/i/0');
  });

  await t.test('YAML', async () => {
    (await ua.putOk('/yaml', {yaml: {hello: 'world'}})).statusIs(200).yamlIs({hello: 'world'});
    (await ua.putOk('/yaml', {yaml: {i: ['♥ mojo']}})).statusIs(200).yamlIs({i: ['♥ mojo']});
    (await ua.putOk('/yaml', {yaml: {i: ['♥ mojo']}})).statusIs(200).yamlIs('♥ mojo', '/i/0');
  });

  await t.test('Inline view', async () => {
    (await ua.getOk('/inline')).statusIs(200).bodyIs('works');
  });

  await t.test('Not found', async () => {
    (await ua.putOk('/does_not_exist')).statusIs(404).typeIs('text/plain; charset=utf-8');
  });

  await t.test('Exception', async () => {
    (await ua.getOk('/exception/works')).statusIs(500).bodyLike(/Error: Something went wrong: works/);
  });

  await t.test('Nested routes', async () => {
    (await ua.getOk('/nested?auth=1')).statusIs(200).bodyIs('Authenticated');
    (await ua.getOk('/nested?auth=0')).statusIs(200).bodyIs('Permission denied');
    (await ua.getOk('/nested/test/methods?auth=1')).statusIs(200).bodyIs('X:GET');
    (await ua.putOk('/nested/test/methods?auth=1')).statusIs(200).bodyIs('X:PUT');
    (await ua.postOk('/nested/test/methods?auth=1')).statusIs(200).bodyIs('X:POST');
    (await ua.getOk('/nested/test/methods?auth=0')).statusIs(200).bodyIs('Permission denied');
    (await ua.getOk('/nested/test?auth=1')).statusIs(404);
    (await ua.getOk('/nested/test/foo?auth=1')).statusIs(404);
  });

  await t.test('Custom status', async () => {
    (await ua.getOk('/status')).statusIs(289).bodyIs('Custom status');
    t.equal(ua.res.statusMessage, 'Whatever');
  });

  await t.test('Config and models', async () => {
    (await ua.getOk('/config')).statusIs(200).bodyIs('Test works');
  });

  await t.test('Request ID', async () => {
    (await ua.getOk('/request_id')).statusIs(200).bodyLike(/^[0-9]+-[0-9a-z]{6}$/);
    (await ua.getOk('/custom/request_id')).statusIs(200).bodyIs('123');
  });

  await t.test('Cookie', async () => {
    (await ua.getOk('/cookie')).statusIs(200).bodyIs('Cookie: not present');
    (await ua.getOk('/cookie')).statusIs(200).bodyIs('Cookie: present');
    (await ua.getOk('/cookie')).statusIs(200).bodyIs('Cookie: present');
  });

  await t.test('Chunked transfer encoding', async () => {
    (await ua.getOk('/chunked')).headerExistsNot('Content-Length').statusIs(200).bodyIs('Hello World!');
  });

  await t.test('UserAgent', async () => {
    (await ua.getOk('/ua')).statusIs(200).bodyIs('Test works');
  });

  await t.test('urlFor', async () => {
    const baseURL = ua.server.urls[0];
    (await ua.postOk('/url_for', {form: {target: '/foo'}})).statusIs(200).bodyIs('/foo');
    (await ua.postOk('/url_for', {form: {target: '/foo/bar.txt'}})).statusIs(200).bodyIs('/foo/bar.txt');
    (await ua.postOk('/url_for', {form: {target: 'root-route'}})).statusIs(200).bodyIs('/');
    (await ua.postOk('/url_for', {form: {target: 'current'}})).statusIs(200).bodyIs('/url_for');
    (await ua.postOk('/url_for', {form: {target: 'current', msg: 'test'}})).statusIs(200).bodyIs('/url_for/test');
    (await ua.postOk('/url_for', {form: {target: 'https://mojolicious.org'}}))
      .statusIs(200)
      .bodyIs('https://mojolicious.org');
    (await ua.postOk('/url_for', {form: {target: 'websocket_route'}}))
      .statusIs(200)
      .bodyIs(`${baseURL}websocket/route/works`.replace(/^http/, 'ws'));
    (await ua.postOk('/url_for', {form: {target: 'exception', msg: 'test'}})).statusIs(200).bodyIs('/exception/test');
  });

  await t.test('redirectTo', async () => {
    const baseURL = ua.server.urls[0];
    (await ua.postOk('/redirect', {form: {target: '/foo'}}))
      .statusIs(302)
      .headerIs('Location', `${baseURL}foo`)
      .bodyIs('');
    (await ua.postOk('/redirect', {form: {target: '/foo', status: '301'}}))
      .statusIs(301)
      .headerIs('Location', `${baseURL}foo`)
      .bodyIs('');
    (await ua.postOk('/redirect', {form: {target: 'websocket_route'}}))
      .statusIs(302)
      .headerIs('Location', `${baseURL}websocket/route/works`.replace(/^http/, 'ws'))
      .bodyIs('');
    (await ua.postOk('/redirect', {form: {target: 'https://mojolicious.org'}}))
      .statusIs(302)
      .headerIs('Location', 'https://mojolicious.org')
      .bodyIs('');
  });

  await t.test('Maybe render', async () => {
    (await ua.putOk('/maybe', {json: {text: 'Works', maybe: true}})).statusIs(200).bodyIs('Works');
    (await ua.putOk('/maybe', {json: {text: 'Works', maybe: false}})).statusIs(200).bodyIs('Works');
    (await ua.putOk('/maybe', {json: {template: 'missing', maybe: true}})).statusIs(200).bodyIs('Fallback');
    (await ua.putOk('/maybe', {json: {template: 'missing', maybe: false}})).statusIs(500);
    (await ua.putOk('/maybe', {json: {template: 'missing'}})).statusIs(500);
  });

  await t.test('Response API', async () => {
    (await ua.getOk('/res'))
      .statusIs(200)
      .headerExists('Content-Length')
      .headerExistsNot('Content-Type')
      .bodyIs('Hello World!');
  });

  await t.test('Session', async t => {
    (await ua.getOk('/session/members')).statusIs(200).bodyIs('Member: not logged in, no extra cookie');
    (await ua.getOk('/session/login/kraih')).statusIs(200).bodyIs('Login: kraih');
    (await ua.getOk('/session/members')).statusIs(200).bodyIs('Member: kraih, with extra cookie');
    (await ua.getOk('/session/update/sri')).statusIs(200).bodyIs('Update: sri');
    (await ua.getOk('/session/logout')).statusIs(200).bodyIs('Logout: sri');
    (await ua.getOk('/session/members')).statusIs(200).bodyIs('Member: not logged in, with extra cookie');

    (await ua.getOk('/session/login/kraih')).statusIs(200).bodyIs('Login: kraih');
    t.match(ua.res.get('Set-Cookie'), /Path=\//);
    t.match(ua.res.get('Set-Cookie'), /HttpOnly/);
    t.match(ua.res.get('Set-Cookie'), /SameSite=Lax/);
    t.match(ua.res.get('Set-Cookie'), /mojo=/);
    (await ua.getOk('/session/logout')).statusIs(200).bodyIs('Logout: kraih');

    (await ua.getOk('/session/members', {headers: {Cookie: 'mojo=something'}}))
      .statusIs(200)
      .bodyIs('Member: not logged in, with extra cookie');
    const realValue = 'mojo=eyJ1c2VyIjoia3JhaWgiLCJleHBpcmVzIjoxNjIwOTQwOTIzfQ--';
    (await ua.getOk('/session/members', {headers: {Cookie: realValue}}))
      .statusIs(200)
      .bodyIs('Member: not logged in, with extra cookie');
    (await ua.getOk('/session/members', {headers: {Cookie: 'realValue--abcdef'}}))
      .statusIs(200)
      .bodyIs('Member: not logged in, with extra cookie');

    (await ua.getOk('/session/expiration')).statusIs(200).bodyIs('expiration: none, value: none');
    (await ua.getOk('/session/expiration?expiration=120')).statusIs(302).bodyIs('');
    (await ua.getOk('/session/expiration')).statusIs(200).bodyIs('expiration: 120, value: works');
    (await ua.getOk('/session/expiration?expiration=0')).statusIs(302).bodyIs('');
    (await ua.getOk('/session/expiration')).statusIs(200).bodyIs('expiration: 0, value: works');
    (await ua.getOk('/session/expiration')).statusIs(200).bodyIs('expiration: 0, value: works');
  });

  await t.test('Flash', async () => {
    (await ua.getOk('/flash')).statusIs(200).bodyIs('Flash: none');
    (await ua.getOk('/flash?message=Hello')).statusIs(200).bodyIs('Flash: none');
    (await ua.getOk('/flash')).statusIs(200).bodyIs('Flash: Hello');
    (await ua.getOk('/flash')).statusIs(200).bodyIs('Flash: none');

    (await ua.getOk('/flash')).statusIs(200).bodyIs('Flash: none');
    (await ua.getOk('/flash?message=Hello')).statusIs(200).bodyIs('Flash: none');
    (await ua.getOk('/flash?message=World')).statusIs(200).bodyIs('Flash: Hello');
    (await ua.getOk('/flash?message=!')).statusIs(200).bodyIs('Flash: World');
    (await ua.getOk('/flash')).statusIs(200).bodyIs('Flash: !');
    (await ua.getOk('/flash')).statusIs(200).bodyIs('Flash: none');

    (await ua.getOk('/flash?message=Hello')).statusIs(200).bodyIs('Flash: none');
    (await ua.getOk('/')).statusIs(200).bodyIs('Hello Mojo!');
    (await ua.getOk('/flash?message=World')).statusIs(200).bodyIs('Flash: Hello');
    (await ua.getOk('/')).statusIs(200).bodyIs('Hello Mojo!');
    (await ua.getOk('/flash?message=!')).statusIs(200).bodyIs('Flash: World');
    (await ua.getOk('/flash')).statusIs(200).bodyIs('Flash: !');
    (await ua.getOk('/flash')).statusIs(200).bodyIs('Flash: none');

    (await ua.getOk('/flash/two')).statusIs(200).bodyIs('first: nothing, second: nothing');
    (await ua.getOk('/flash/two')).statusIs(200).bodyIs('first: one, second: two');
  });

  await t.test('Session (secret rotation)', async t => {
    (await ua.getOk('/session/members')).statusIs(200).bodyIs('Member: not logged in, with extra cookie');
    (await ua.getOk('/session/login/kraih')).statusIs(200).bodyIs('Login: kraih');
    (await ua.getOk('/session/members')).statusIs(200).bodyIs('Member: kraih, with extra cookie');

    app.secrets.unshift('AlsoInsecure');
    (await ua.getOk('/session/members')).statusIs(200).bodyIs('Member: kraih, with extra cookie');

    t.equal(app.secrets.pop(), 'Insecure');
    (await ua.getOk('/session/members')).statusIs(200).bodyIs('Member: kraih, with extra cookie');
    (await ua.getOk('/session/members')).statusIs(200).bodyIs('Member: kraih, with extra cookie');
    (await ua.getOk('/session/logout')).statusIs(200).bodyIs('Logout: kraih');
    (await ua.getOk('/session/members')).statusIs(200).bodyIs('Member: not logged in, with extra cookie');
  });

  await t.test('Session (bad cookies)', async t => {
    const cookieJar = ua.cookieJar;
    ua.cookieJar = null;

    (await ua.getOk('/session/members', {headers: {Cookie: 'mojo=invalid'}}))
      .statusIs(200)
      .bodyIs('Member: not logged in, no extra cookie');
    (await ua.getOk('/session/members', {headers: {Cookie: '--'}}))
      .statusIs(200)
      .bodyIs('Member: not logged in, no extra cookie');
    (await ua.getOk('/session/members', {headers: {Cookie: 'mojo=very--bar'}}))
      .statusIs(200)
      .bodyIs('Member: not logged in, no extra cookie');
    (await ua.getOk('/session/members', {headers: {Cookie: 'mojo=very--very--bar'}}))
      .statusIs(200)
      .bodyIs('Member: not logged in, no extra cookie');
    (await ua.getOk('/session/members', {headers: {Cookie: ''}}))
      .statusIs(200)
      .bodyIs('Member: not logged in, no extra cookie');

    const encrypted = await Session.encrypt(app.secrets[0], '{"user":"test"}');
    t.same(await Session.decrypt(app.secrets, encrypted), '{"user":"test"}');
    t.same(await Session.decrypt(app.secrets, `fails${encrypted}`), null);
    (await ua.getOk('/session/members', {headers: {Cookie: `mojo=${encrypted}`}}))
      .statusIs(200)
      .bodyIs('Member: test, no extra cookie');

    ua.cookieJar = cookieJar;
  });

  await t.test('Session (different cookie name)', async t => {
    app.session.cookieName = 'myapp-session';
    (await ua.getOk('/session/members')).statusIs(200).bodyIs('Member: not logged in, with extra cookie');
    (await ua.getOk('/session/login/kraih')).statusIs(200).bodyIs('Login: kraih');
    (await ua.getOk('/session/members')).statusIs(200).bodyIs('Member: kraih, with extra cookie');
    t.match(ua.res.get('Set-Cookie'), /myapp-session=/);
    (await ua.getOk('/session/logout')).statusIs(200).bodyIs('Logout: kraih');
    (await ua.getOk('/session/members')).statusIs(200).bodyIs('Member: not logged in, with extra cookie');
  });

  await t.test('Content negotiation', async () => {
    (await ua.getOk('/content/negotiation', {headers: {Accept: 'application/json'}}))
      .statusIs(200)
      .typeIs('application/json; charset=utf-8')
      .jsonIs({some: 'JSON'});
    (await ua.getOk('/content/negotiation', {headers: {Accept: 'text/html'}}))
      .statusIs(200)
      .typeIs('text/html; charset=utf-8')
      .bodyIs('Some HTML');
    (await ua.getOk('/content/negotiation', {headers: {Accept: 'text/plain'}})).statusIs(204).bodyIs('');

    (await ua.getOk('/content/negotiation.json'))
      .statusIs(200)
      .typeIs('application/json; charset=utf-8')
      .jsonIs({some: 'JSON'});
    (await ua.getOk('/content/negotiation.html')).statusIs(200).typeIs('text/html; charset=utf-8').bodyIs('Some HTML');
    (await ua.getOk('/content/negotiation.txt')).statusIs(404);

    (await ua.getOk('/content/negotiation.json', {headers: {Accept: 'application/json'}}))
      .statusIs(200)
      .typeIs('application/json; charset=utf-8')
      .jsonIs({some: 'JSON'});
    (await ua.getOk('/content/negotiation.html', {headers: {Accept: 'text/html'}}))
      .statusIs(200)
      .typeIs('text/html; charset=utf-8')
      .bodyIs('Some HTML');

    (await ua.getOk('/content/negotiation.html', {headers: {Accept: 'application/json'}}))
      .statusIs(200)
      .typeIs('text/html; charset=utf-8')
      .bodyIs('Some HTML');
    (await ua.getOk('/content/negotiation.json', {headers: {Accept: 'text/html'}}))
      .statusIs(200)
      .typeIs('application/json; charset=utf-8')
      .jsonIs({some: 'JSON'});

    (await ua.getOk('/content/negotiation', {headers: {Accept: 'text/plain, application/json'}}))
      .statusIs(200)
      .typeIs('application/json; charset=utf-8')
      .jsonIs({some: 'JSON'});
    (await ua.getOk('/content/negotiation', {headers: {Accept: 'text/plain, application/json, */*'}}))
      .statusIs(200)
      .typeIs('application/json; charset=utf-8')
      .jsonIs({some: 'JSON'});
    (await ua.getOk('/content/negotiation', {headers: {Accept: '*/*, application/json'}}))
      .statusIs(200)
      .typeIs('application/json; charset=utf-8')
      .jsonIs({some: 'JSON'});
    (await ua.getOk('/content/negotiation', {headers: {Accept: 'application/json, text/html;Q=1.5'}}))
      .statusIs(200)
      .typeIs('text/html; charset=utf-8')
      .bodyIs('Some HTML');

    (await ua.getOk('/content/negotiation/fallback', {headers: {Accept: 'application/json'}}))
      .statusIs(200)
      .typeIs('application/json; charset=utf-8')
      .jsonIs({just: 'JSON'});
    (await ua.getOk('/content/negotiation/fallback', {headers: {Accept: 'text/plain'}}))
      .statusIs(200)
      .typeIs('text/plain; charset=utf-8')
      .bodyIs('Fallback');
    (await ua.getOk('/content/negotiation/fallback'))
      .statusIs(200)
      .typeIs('text/plain; charset=utf-8')
      .bodyIs('Fallback');
  });

  await t.test('Content negotiation (accepts)', async () => {
    (await ua.getOk('/accepts', {headers: {Accept: 'application/json'}, json: null}))
      .statusIs(200)
      .jsonIs({accepts: ['json']});
    (await ua.getOk('/accepts', {headers: {Accept: 'application/json, text/html;Q=1.5'}, json: null}))
      .statusIs(200)
      .jsonIs({accepts: ['html', 'json']});

    (await ua.getOk('/accepts.txt', {headers: {Accept: 'application/json, text/html;Q=1.5'}, json: null}))
      .statusIs(200)
      .jsonIs({accepts: ['txt', 'html', 'json']});

    (
      await ua.getOk('/accepts.txt', {
        headers: {Accept: 'application/json, text/html;Q=1.5'},
        json: ['json', 'html']
      })
    )
      .statusIs(200)
      .jsonIs({accepts: ['html', 'json']});
    (await ua.getOk('/accepts', {headers: {Accept: 'application/json, text/html;Q=1.5'}, json: ['json']}))
      .statusIs(200)
      .jsonIs({accepts: ['json']});

    (await ua.getOk('/accepts', {json: null})).statusIs(200).jsonIs({accepts: null});
    (await ua.getOk('/accepts', {headers: {Accept: 'application/json, text/html;Q=1.5'}, json: ['png']}))
      .statusIs(200)
      .jsonIs({accepts: null});
    (await ua.getOk('/accepts', {headers: {Accept: 'application/json, text/html;Q=1.5'}, json: []}))
      .statusIs(200)
      .jsonIs({accepts: null});
  });

  await t.test('Reverse proxy (X-Forwarded-For)', async () => {
    (await ua.getOk('/ip')).statusIs(200).bodyUnlike(/104\.24\.31\.8/);
    (await ua.getOk('/ip', {headers: {'X-Forwarded-For': '104.24.31.8'}})).statusIs(200).bodyUnlike(/104\.24\.31\.8/);

    ua.server.reverseProxy = true;
    (await ua.getOk('/ip')).statusIs(200).bodyUnlike(/104\.24\.31\.8/);
    (await ua.getOk('/ip', {headers: {'X-Forwarded-For': '104.24.31.8'}})).statusIs(200).bodyIs('Address: 104.24.31.8');
    (await ua.getOk('/ip', {headers: {'X-Forwarded-For': '192.0.2.2, 192.0.2.1'}}))
      .statusIs(200)
      .bodyIs('Address: 192.0.2.1');
    (await ua.getOk('/ip', {headers: {'X-Forwarded-For': '192.0.2.2,192.0.2.1'}}))
      .statusIs(200)
      .bodyIs('Address: 192.0.2.1');
    ua.server.reverseProxy = false;
  });

  await t.test('Reverse proxy (X-Forwarded-Proto)', async () => {
    (await ua.getOk('/protocol')).statusIs(200).bodyIs('Protocol: http');
    (await ua.getOk('/protocol', {headers: {'X-Forwarded-Proto': 'https'}})).statusIs(200).bodyIs('Protocol: http');

    ua.server.reverseProxy = true;
    (await ua.getOk('/protocol')).statusIs(200).bodyIs('Protocol: http');
    (await ua.getOk('/protocol', {headers: {'X-Forwarded-Proto': 'https'}})).statusIs(200).bodyIs('Protocol: https');
    ua.server.reverseProxy = false;
  });

  await t.test('multipart/form-data', async () => {
    (await ua.postOk('/form/data', {formData: {first: 'works'}}))
      .statusIs(200)
      .jsonIs({first: 'works', second: 'missing'});

    (await ua.postOk('/form/data', {formData: {first: 'One', second: 'Two'}}))
      .statusIs(200)
      .jsonIs({first: 'One', second: 'Two'});
  });

  await t.test('Mixed forms', async () => {
    (await ua.postOk('/form/mixed?one=works')).statusIs(200).jsonIs({one: 'works', two: 'missing', three: 'missing'});

    (await ua.postOk('/form/mixed', {query: {two: 'works'}}))
      .statusIs(200)
      .jsonIs({one: 'missing', two: 'works', three: 'missing'});

    (await ua.postOk('/form/mixed', {form: {three: 'works'}}))
      .statusIs(200)
      .jsonIs({one: 'missing', two: 'missing', three: 'works'});

    (await ua.postOk('/form/mixed?one=works', {form: {two: 'too'}}))
      .statusIs(200)
      .jsonIs({one: 'works', two: 'too', three: 'missing'});

    (await ua.postOk('/form/mixed?two=works', {formData: {three: 'works'}}))
      .statusIs(200)
      .jsonIs({one: 'missing', two: 'works', three: 'works'});

    (await ua.postOk('/form/mixed?one=&two=&three=works'))
      .statusIs(200)
      .jsonIs({one: 'missing', two: 'missing', three: 'works'});

    (await ua.postOk('/form/mixed?two=', {formData: {one: '', three: 'works'}}))
      .statusIs(200)
      .jsonIs({one: 'missing', two: 'missing', three: 'works'});
  });

  await t.test('Uploads', async t => {
    (
      await ua.postOk('/form/upload', {formData: {test: {content: 'Hello!', filename: 'test.txt'}, it: 'works'}})
    ).statusIs(200);
    const data = JSON.parse(ua.body);
    t.same(data.uploads, [{fieldname: 'test', filename: 'test.txt', content: 'Hello!', limit: false}]);
    t.same(data.params, {it: 'works'});

    (await ua.postOk('/form/upload', {formData: {test: {content: 'Hello World!', filename: 'test2.txt'}}})).statusIs(
      200
    );
    const data2 = JSON.parse(ua.body);
    t.same(data2.uploads, [{fieldname: 'test', filename: 'test2.txt', content: 'Hello Worl', limit: true}]);
    t.same(data2.params, {});

    (
      await ua.postOk('/form/upload', {
        formData: {
          test: {content: 'Hello', filename: 'test2.txt'},
          test2: {content: 'World', filename: 'test3.txt'},
          test3: {content: '!', filename: 'test4.txt'},
          test4: 'One',
          test5: 'Two'
        }
      })
    ).statusIs(200);
    const data3 = JSON.parse(ua.body);
    t.same(data3.uploads, [
      {fieldname: 'test', filename: 'test2.txt', content: 'Hello', limit: false},
      {fieldname: 'test2', filename: 'test3.txt', content: 'World', limit: false},
      {fieldname: 'test3', filename: 'test4.txt', content: '!', limit: false}
    ]);
    t.same(data3.params, {test4: 'One', test5: 'Two'});

    (await ua.postOk('/form/upload', {formData: {it: 'works'}})).statusIs(200);
    const data4 = JSON.parse(ua.body);
    t.same(data4.uploads, []);
    t.same(data4.params, {it: 'works'});
  });

  await t.test('Validation', async t => {
    (await ua.putOk('/schema/user', {json: {username: 'kraih'}})).statusIs(200).jsonIs({valid: true});
    (await ua.putOk('/schema/user', {json: {user: 'kraih'}})).statusIs(200).jsonIs({valid: false});
    (await ua.putOk('/schema/user', {json: {username: 'sri'}})).statusIs(200).jsonIs({valid: true});

    t.throws(() => app.validator.schema('test123'), new Error('Invalid schema: test123'));

    (await ua.putOk('/schema/dynamic', {json: {test: 123}})).statusIs(200).jsonIs({valid: true, errors: []});
    (await ua.putOk('/schema/dynamic', {json: {test: '123'}})).statusIs(200).jsonIs({valid: true, errors: []});
    (await ua.putOk('/schema/dynamic', {json: {test: ' 123'}})).statusIs(200).jsonIs({valid: true, errors: []});
    t.ok(app.validator.schema('test123'));
    (await ua.putOk('/schema/dynamic', {json: {test: 'a123'}})).statusIs(200).jsonIs({
      valid: false,
      errors: [
        {
          instancePath: '/test',
          schemaPath: '#/properties/test/type',
          message: 'must be number'
        }
      ]
    });

    (await ua.putOk('/schema/form', {form: {test: 'works'}})).statusIs(200).jsonIs({valid: true});
    (await ua.putOk('/schema/form', {form: {test2: 'fails'}})).statusIs(200).jsonIs({valid: false});

    (await ua.putOk('/schema/form', {formData: {test: 'works'}})).statusIs(200).jsonIs({valid: true});
    (await ua.putOk('/schema/form', {formData: {test2: 'fails'}})).statusIs(200).jsonIs({valid: false});

    (await ua.putOk('/schema/form', {query: {test: 'works'}})).statusIs(200).jsonIs({valid: true});
    (await ua.putOk('/schema/form', {query: {test2: 'fails'}})).statusIs(200).jsonIs({valid: false});

    (await ua.putOk('/schema/form?test=works')).statusIs(200).jsonIs({valid: true});
    (await ua.putOk('/schema/form?test2=fails')).statusIs(200).jsonIs({valid: false});

    (await ua.putOk('/schema/array', {json: {test: ['works', 'fine']}}))
      .statusIs(200)
      .jsonIs({valid: true, errors: [], data: {test: ['works', 'fine']}});
    (await ua.putOk('/schema/array', {json: {test: 'also works'}}))
      .statusIs(200)
      .jsonIs({valid: true, errors: [], data: {test: ['also works']}});
    (await ua.putOk('/schema/array', {json: {test: {this: 'fails'}}})).statusIs(200).jsonIs({
      valid: false,
      errors: [
        {
          instancePath: '/test',
          schemaPath: '#/properties/test/type',
          message: 'must be array'
        }
      ],
      data: {test: {this: 'fails'}}
    });
  });

  await t.test('Compression', async () => {
    (await ua.getOk('/gzip'))
      .statusIs(200)
      .headerIsnt('Content-Length', '2048')
      .headerIs('Content-Encoding', 'gzip')
      .headerIs('Vary', 'Accept-Encoding')
      .bodyIs('a'.repeat(2048));

    app.renderer.autoCompress = false;
    (await ua.getOk('/gzip'))
      .statusIs(200)
      .headerIs('Content-Length', '2048')
      .headerIsnt('Content-Encoding', 'gzip')
      .headerIsnt('Vary', 'Accept-Encoding')
      .bodyIs('a'.repeat(2048));
    app.renderer.autoCompress = true;

    (await ua.getOk('/gzip'))
      .statusIs(200)
      .headerIsnt('Content-Length', '2048')
      .headerIs('Content-Encoding', 'gzip')
      .headerIs('Vary', 'Accept-Encoding')
      .bodyIs('a'.repeat(2048));

    (await ua.getOk('/gzip', {headers: {'Accept-Encoding': 'nothing'}}))
      .statusIs(200)
      .headerIs('Content-Length', '2048')
      .headerIsnt('Content-Encoding', 'gzip')
      .headerIs('Vary', 'Accept-Encoding')
      .bodyIs('a'.repeat(2048));
  });

  await t.test('Mock context', async () => {
    app.defaults.test = 'works';
    const ctx = app.newMockContext();
    t.equal(ctx.backend.name, 'mock');
    t.equal(ctx.req.method, 'GET');
    t.equal(ctx.req.path, '/');
    t.same(ctx.currentRoute(), null);
    t.equal(ctx.stash.test, 'works');
    ctx.stash.test = null;
    t.equal(app.defaults.test, 'works');

    const params = await ctx.params();
    t.same(params.isEmpty, true);
    params.set('foo', 'bar');
    t.same(params.isEmpty, false);

    ctx.stash.hello = 'mojo';
    t.equal(ctx.stash.hello, 'mojo');
    t.equal(await ctx.renderToString({inline: 'Test: <%= hello %>'}), 'Test: mojo');
    t.equal(app.newMockContext().tag('p', {class: 'test'}, 'Hello!').toString(), '<p class="test">Hello!</p>');

    const logs = app.log.capture('trace');
    await ctx.render({text: 'Hello World!'});
    logs.stop();
    t.match(logs.toString(), /Mock response has been sent/);

    const ctx2 = app.newMockContext({method: 'POST', url: '/test', headers: ['Host', 'localhost']});
    t.equal(ctx2.req.method, 'POST');
    t.equal(ctx2.req.path, '/test');
    t.equal(ctx2.req.headers.get('Host'), 'localhost');
  });

  await t.test('URL generation', t => {
    const ctx = app.newMockContext();
    ctx.req.set('Host', 'example.com');

    t.equal(ctx.urlFor('/what/ever'), '/what/ever');
    t.equal(ctx.urlWith('/what/ever'), '/what/ever');
    ctx.req.query.set('foo', 'bar');
    ctx.req.query.set('baz', 'yada');
    t.equal(ctx.urlFor('/what/ever'), '/what/ever');
    t.equal(ctx.urlWith('/what/ever'), '/what/ever?foo=bar&baz=yada');

    t.equal(ctx.urlFor('websocket_route'), 'ws://example.com/websocket/route/works');
    t.equal(ctx.urlFor('methods', {query: {_method: 'PUT'}}), '/methods?_method=PUT');
    t.equal(ctx.urlFor('methods', {query: {_method: 'PUT'}, fragment: 'foo'}), '/methods?_method=PUT#foo');
    t.equal(ctx.urlFor('methods', {absolute: true, query: {_method: 'PUT'}}), 'http://example.com/methods?_method=PUT');
    t.equal(ctx.urlFor('/what/ever', {query: {_method: 'PUT'}}), '/what/ever?_method=PUT');
    t.equal(ctx.urlFor('methods', {query: {b: 'B', a: 'A', c: 'C'}}), '/methods?b=B&a=A&c=C');
    t.equal(ctx.urlFor('methods', {query: {b: 'B', a: ['A', 'C']}}), '/methods?b=B&a=A&a=C');
    t.equal(ctx.urlFor('/whatever', {fragment: 'test-123#test'}), '/whatever#test-123%23test');
    t.equal(
      ctx.urlFor('exception', {query: {_method: 'QUERY'}, values: {msg: 'test'}}),
      '/exception/test?_method=QUERY'
    );

    t.equal(ctx.urlWith('/what/ever', {query: {baz: 'works'}}), '/what/ever?foo=bar&baz=works');
    t.equal(ctx.urlWith('/what/ever', {query: {foo: 'works', baz: 'too'}}), '/what/ever?foo=works&baz=too');
    t.equal(ctx.urlWith('/what/ever', {query: {baz: null}}), '/what/ever?foo=bar');
    t.equal(ctx.urlWith('/what/ever', {query: {baz: null, foo: null}}), '/what/ever');
    t.equal(ctx.urlWith('exception', {query: {baz: 'too'}, values: {msg: 'tset'}}), '/exception/tset?foo=bar&baz=too');
    t.equal(
      ctx.urlWith('/what/ever', {absolute: true, fragment: 'works', query: {foo: 'works'}}),
      'http://example.com/what/ever?foo=works&baz=yada#works'
    );

    t.end();
  });

  await t.test('URL generation (missing routes)', t => {
    const ctx = app.newMockContext();

    let result;
    try {
      ctx.urlFor('current');
    } catch (error) {
      result = error;
    }
    t.match(result.message, 'No current route to generate URL for');

    let result2;
    try {
      ctx.urlWith('current');
    } catch (error) {
      result2 = error;
    }
    t.match(result2.message, 'No current route to generate URL for');

    let result3;
    try {
      ctx.urlFor('missing_route');
    } catch (error) {
      result3 = error;
    }
    t.match(result3.message, 'No route to generate URL for');

    let result4;
    try {
      ctx.urlWith('missing_route');
    } catch (error) {
      result4 = error;
    }
    t.match(result4.message, 'No route to generate URL for');

    t.end();
  });

  await t.test('Partial content', async t => {
    const ctx = app.newMockContext();
    t.equal(ctx.content.foo.toString(), '');
    ctx.content.foo = 'Works!';
    t.equal(ctx.content.foo.toString(), 'Works!');
    delete ctx.content.foo;
    t.equal(ctx.content.foo.toString(), '');

    await ctx.contentFor('bar', '<p>Test</p>');
    t.equal(ctx.content.bar.toString(), '<p>Test</p>');
    ctx.content.header = 'Hello ';
    ctx.content.header += 'Mojo!';
    t.equal(ctx.content.header.toString(), 'Hello Mojo!');
    await ctx.contentFor('header', '!!');
    t.equal(ctx.content.header.toString(), 'Hello Mojo!!!');

    await ctx.contentFor('baz', Promise.resolve('<p>Test</p>'));
    t.equal(ctx.content.baz.toString(), '<p>Test</p>');
    await ctx.contentFor('yada', async () => new SafeString('<p>Works too</p>'));
    t.equal(ctx.content.yada.toString(), '<p>Works too</p>');
    await ctx.contentFor('yadayada', async () => '<p>Works also</p>');
    t.equal(ctx.content.yadayada.toString(), '<p>Works also</p>');
  });

  await t.test('Request body consumed twice', async () => {
    const logs = app.log.capture('trace');
    (await ua.postOk('/read-twice'))
      .statusIs(500)
      .typeIs('text/plain; charset=utf-8')
      .bodyLike(/Error: Request body has already been consumed/);
    logs.stop();
    t.match(logs.toString(), /\[error\].+Request body has already been consumed/);
  });

  t.test('Forbidden helpers', t => {
    let result;
    try {
      app.addHelper('render', function () {
        throw new Error('Fail!');
      });
    } catch (error) {
      result = error;
    }
    t.match(result, /The name "render" is already used in the prototype chain/);

    try {
      app.addHelper('isWebSocket', function () {
        throw new Error('Fail!');
      });
    } catch (error) {
      result = error;
    }
    t.match(result, /The name "isWebSocket" is already used in the prototype chain/);

    t.end();
  });

  t.test('Nested helper depth limit', t => {
    let result;
    try {
      app.addHelper('too.many.indents', function () {
        throw new Error('Fail!');
      });
    } catch (error) {
      result = error;
    }
    t.match(result, /The name "too\.many\.indents" exceeds maximum depth \(2\) for nested helpers/);

    t.end();
  });

  await ua.stop();
});
