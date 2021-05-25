import mojo from '../lib/mojo.js';
import t from 'tap';

t.test('App', async t => {
  const app = mojo();

  app.log.level = 'fatal';

  app.config.appName = 'Test';
  app.models.test = {it: 'works'};
  app.config.maxFileSize = 10;
  app.models.uploadDir = await mojo.File.tempDir();

  app.validator.addSchema({
    type: 'object',
    properties: {
      username: {type: 'string'}
    },
    required: ['username']
  }, 'user');

  // GET /
  app.get('/', ctx => ctx.render({text: 'Hello Mojo!'}));

  // * /methods
  app.any('/methods', ctx => ctx.render({text: ctx.req.method}));

  // PUT /json
  app.put('/json', async ctx => ctx.render({json: await ctx.req.json()}));

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

  // * /exception/*
  app.any('/exception/:msg', ctx => {
    throw new Error(`Something went wrong: ${ctx.stash.msg}`);
  }).name('exception');

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
  app.post('/', ctx => ctx.render({text: 'Post'}));

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
  app.get('/session/login/:name', ctx => {
    ctx.session.user = ctx.stash.name;
    return ctx.render({text: `Login: ${ctx.stash.name}`});
  });

  // GET /session/members
  app.get('/session/members', ctx => {
    const user = ctx.session.user ?? 'not logged in';
    const extra = ctx.req.getCookie('mojo-extra') ?? 'no extra cookie';
    ctx.res.setCookie('mojo-extra', 'with extra cookie');
    return ctx.render({text: `Member: ${user}, ${extra}`});
  });

  // GET /session/update/*
  app.get('/session/update/:name', ctx => {
    ctx.session.user = ctx.stash.name;
    return ctx.render({text: `Update: ${ctx.session.user}`});
  });

  // GET /session/logout
  app.get('/session/logout', ctx => {
    ctx.session.expires = 1;
    return ctx.render({text: `Logout: ${ctx.session.user}`});
  });

  // GET /client
  app.get('/client', async ctx => {
    const res = await ctx.client.get(client.server.urls[0] + 'config');
    return ctx.render({text: await res.text()});
  });

  // POST /form/data
  app.post('/form/data', async ctx => {
    const form = await ctx.req.formData();
    const data = {first: form.get('first') ?? 'missing', second: form.get('second') ?? 'missing'};

    const files = await ctx.req.files();
    if (files.second !== undefined) {
      data.upload = {
        content: await files.second.file.readFile('utf8'),
        filename: files.second.filename,
        size: files.second.size,
        type: files.second.type
      };
    }

    return ctx.render({json: data});
  });

  // POST /form/mixed
  app.post('/form/mixed', async ctx => {
    const params = await ctx.params();

    const data = {
      one: params.get('one') ?? 'missing',
      two: params.get('two') ?? 'missing',
      three: params.get('three') ?? 'missing'
    };

    const files = await ctx.req.files();
    if (files.four !== undefined) data.four = {content: await files.four.file.readFile('utf8')};

    return ctx.render({json: data});
  });

  // POST /form/upload
  app.post('/form/upload', async ctx => {
    ctx.req.maxFileSize = ctx.config.maxFileSize;
    ctx.req.uploadDir = ctx.models.uploadDir.toString();

    const files = await ctx.req.files();
    if (files === null) return ctx.render({json: {error: 'Upload limit exceeded'}, status: 400});

    const size = files.test.size;
    const path = files.test.file.toString();
    const content = await files.test.file.readFile('utf8');

    return ctx.render({json: {size, path, content}});
  });

  // * /url_for
  app.any('/url_for/:msg', async ctx => {
    const form = await ctx.req.form();
    const target = form.get('target');
    const values = form.has('msg') ? {msg: form.get('msg')} : undefined;
    return ctx.render({text: ctx.urlFor(target, values)});
  }).to({msg: 'fail'});
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
    if (await ctx.render({...options}) === false) ctx.render({text: 'Fallback'});
  });

  // GET /res
  app.get('/res', async ctx => ctx.res.status(200).send('Hello World!'));

  // GET /content/negotiation
  // GET /content/negotiation.html
  // GET /content/negotiation.json
  app.get('/content/negotiation', {ext: ['html', 'json']}, async ctx => {
    await ctx.respondTo({
      html: ctx => ctx.render({text: 'Some HTML', format: 'html'}),
      json: ctx => ctx.render({json: {some: 'JSON'}})
    });
  }).to({ext: null});

  // GET /content/negotiation/fallback
  app.get('/content/negotiation/fallback', async ctx => {
    await ctx.respondTo({
      any: ctx => ctx.render({text: 'Fallback'}),
      json: ctx => ctx.render({json: {just: 'JSON'}})
    });
  });

  // GET /remote_address
  app.get('/remote_address', ctx => ctx.render({text: `Address: ${ctx.req.remoteAddress}`}));

  // GET /protocol
  app.get('/protocol', ctx => ctx.render({text: `Protocol: ${ctx.req.protocol}`}));

  // PUT /schema/user
  app.put('/schema/user', async ctx => {
    const validate = ctx.schema('user');
    const data = await ctx.req.json();
    const valid = validate(data);
    await ctx.render({json: {valid}});
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
    const valid = validate(params.toObject());

    await ctx.render({json: {valid}});
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
    const valid = validate(data);

    await ctx.render({json: {valid}});
  });

  const client = await app.newTestClient({tap: t});

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

  await t.test('Hello World', async t => {
    t.equal(app.router.cache.itemCount, 0);
    (await client.getOk('/')).statusIs(200).headerIs('Content-Length', '11').bodyIs('Hello Mojo!');
    t.equal(app.router.cache.itemCount, 1);
    (await client.getOk('/')).statusIs(200).headerLike('Content-Length', /1/).bodyLike(/Mojo/);
    t.equal(app.router.cache.itemCount, 1);
  });

  await t.test('Methods', async t => {
    (await client.deleteOk('/methods')).statusIs(200).bodyIs('DELETE');
    (await client.getOk('/methods')).statusIs(200).bodyIs('GET');
    (await client.headOk('/methods')).statusIs(200).bodyIs('');
    (await client.optionsOk('/methods')).statusIs(200).bodyIs('OPTIONS');
    (await client.patchOk('/methods')).statusIs(200).bodyIs('PATCH');
    (await client.postOk('/methods')).statusIs(200).bodyIs('POST');
    (await client.putOk('/methods')).statusIs(200).bodyIs('PUT');

    (await client.deleteOk('/')).statusIs(200).bodyIs('Delete');
    (await client.patchOk('/')).statusIs(200).bodyIs('Patch');
    (await client.optionsOk('/')).statusIs(200).bodyIs('Options');
    (await client.postOk('/')).statusIs(200).bodyIs('Post');
  });

  await t.test('JSON', async t => {
    (await client.putOk('/json', {json: {hello: 'world'}})).statusIs(200).jsonIs({hello: 'world'});
  });

  await t.test('Not found', async t => {
    (await client.putOk('/does_not_exist')).statusIs(404).typeIs('text/plain; charset=utf-8');
  });

  await t.test('Exception', async t => {
    (await client.getOk('/exception/works')).statusIs(500).bodyLike(/Error: Something went wrong: works/);
  });

  await t.test('Nested routes', async t => {
    (await client.getOk('/nested?auth=1')).statusIs(200).bodyIs('Authenticated');
    (await client.getOk('/nested?auth=0')).statusIs(200).bodyIs('Permission denied');
    (await client.getOk('/nested/test/methods?auth=1')).statusIs(200).bodyIs('X:GET');
    (await client.putOk('/nested/test/methods?auth=1')).statusIs(200).bodyIs('X:PUT');
    (await client.postOk('/nested/test/methods?auth=1')).statusIs(200).bodyIs('X:POST');
    (await client.getOk('/nested/test/methods?auth=0')).statusIs(200).bodyIs('Permission denied');
    (await client.getOk('/nested/test?auth=1')).statusIs(404);
    (await client.getOk('/nested/test/foo?auth=1')).statusIs(404);
  });

  await t.test('Config and models', async t => {
    (await client.getOk('/config')).statusIs(200).bodyIs('Test works');
  });

  await t.test('Request ID', async t => {
    (await client.getOk('/request_id')).statusIs(200).bodyLike(/^[0-9]+-[0-9a-z]{6}$/);
    (await client.getOk('/custom/request_id')).statusIs(200).bodyIs('123');
  });

  await t.test('Cookie', async t => {
    (await client.getOk('/cookie')).statusIs(200).bodyIs('Cookie: not present');
    (await client.getOk('/cookie')).statusIs(200).bodyIs('Cookie: present');
    (await client.getOk('/cookie')).statusIs(200).bodyIs('Cookie: present');
  });

  await t.test('Client', async t => {
    (await client.getOk('/client')).statusIs(200).bodyIs('Test works');
  });

  await t.test('urlFor', async t => {
    const baseURL = client.server.urls[0];
    (await client.postOk('/url_for', {form: {target: '/foo'}})).statusIs(200).bodyIs(`${baseURL}foo`);
    (await client.postOk('/url_for', {form: {target: '/foo/bar.txt'}})).statusIs(200).bodyIs(`${baseURL}foo/bar.txt`);
    (await client.postOk('/url_for', {form: {target: 'current'}})).statusIs(200).bodyIs(`${baseURL}url_for`);
    (await client.postOk('/url_for', {form: {target: 'current', msg: 'test'}})).statusIs(200)
      .bodyIs(`${baseURL}url_for/test`);
    (await client.postOk('/url_for', {form: {target: 'https://mojolicious.org'}})).statusIs(200)
      .bodyIs('https://mojolicious.org');
    (await client.postOk('/url_for', {form: {target: 'websocket_route'}})).statusIs(200)
      .bodyIs(`${baseURL}websocket/route/works`.replace(/^http/, 'ws'));
    (await client.postOk('/url_for', {form: {target: 'exception', msg: 'test'}})).statusIs(200)
      .bodyIs(`${baseURL}exception/test`);
  });

  await t.test('redirectTo', async t => {
    const baseURL = client.server.urls[0];
    (await client.postOk('/redirect', {form: {target: '/foo'}})).statusIs(302)
      .headerIs('Location', `${baseURL}foo`).bodyIs('');
    (await client.postOk('/redirect', {form: {target: '/foo', status: '301'}})).statusIs(301)
      .headerIs('Location', `${baseURL}foo`).bodyIs('');
    (await client.postOk('/redirect', {form: {target: 'websocket_route'}})).statusIs(302)
      .headerIs('Location', `${baseURL}websocket/route/works`.replace(/^http/, 'ws')).bodyIs('');
    (await client.postOk('/redirect', {form: {target: 'https://mojolicious.org'}})).statusIs(302)
      .headerIs('Location', 'https://mojolicious.org').bodyIs('');
  });

  await t.test('Maybe render', async t => {
    (await client.putOk('/maybe', {json: {text: 'Works', maybe: true}})).statusIs(200).bodyIs('Works');
    (await client.putOk('/maybe', {json: {text: 'Works', maybe: false}})).statusIs(200).bodyIs('Works');
    (await client.putOk('/maybe', {json: {template: 'missing', maybe: true}})).statusIs(200).bodyIs('Fallback');
    (await client.putOk('/maybe', {json: {template: 'missing', maybe: false}})).statusIs(500);
    (await client.putOk('/maybe', {json: {template: 'missing'}})).statusIs(500);
  });

  await t.test('Response API', async t => {
    (await client.getOk('/res')).statusIs(200).headerExists('Content-Length').headerExistsNot('Content-Type')
      .bodyIs('Hello World!');
  });

  await t.test('Session', async t => {
    (await client.getOk('/session/members')).statusIs(200).bodyIs('Member: not logged in, no extra cookie');
    (await client.getOk('/session/login/kraih')).statusIs(200).bodyIs('Login: kraih');
    (await client.getOk('/session/members')).statusIs(200).bodyIs('Member: kraih, with extra cookie');
    (await client.getOk('/session/update/sri')).statusIs(200).bodyIs('Update: sri');
    (await client.getOk('/session/logout')).statusIs(200).bodyIs('Logout: sri');
    (await client.getOk('/session/members')).statusIs(200).bodyIs('Member: not logged in, with extra cookie');

    (await client.getOk('/session/login/kraih')).statusIs(200).bodyIs('Login: kraih');
    t.match(client.res.get('Set-Cookie'), /Path=\//);
    t.match(client.res.get('Set-Cookie'), /HttpOnly/);
    t.match(client.res.get('Set-Cookie'), /SameSite=Lax/);
    t.match(client.res.get('Set-Cookie'), /mojo=/);
    (await client.getOk('/session/logout')).statusIs(200).bodyIs('Logout: kraih');

    (await client.getOk('/session/members', {headers: {Cookie: 'mojo=something'}})).statusIs(200)
      .bodyIs('Member: not logged in, with extra cookie');
    const realValue = 'mojo=eyJ1c2VyIjoia3JhaWgiLCJleHBpcmVzIjoxNjIwOTQwOTIzfQ--';
    (await client.getOk('/session/members', {headers: {Cookie: realValue}})).statusIs(200)
      .bodyIs('Member: not logged in, with extra cookie');
    (await client.getOk('/session/members', {headers: {Cookie: 'realValue--abcdef'}})).statusIs(200)
      .bodyIs('Member: not logged in, with extra cookie');
  });

  await t.test('Session (secret rotation)', async t => {
    (await client.getOk('/session/members')).statusIs(200).bodyIs('Member: not logged in, with extra cookie');
    (await client.getOk('/session/login/kraih')).statusIs(200).bodyIs('Login: kraih');
    (await client.getOk('/session/members')).statusIs(200).bodyIs('Member: kraih, with extra cookie');

    app.secrets.unshift('AlsoInsecure');
    (await client.getOk('/session/members')).statusIs(200).bodyIs('Member: kraih, with extra cookie');

    t.equal(app.secrets.pop(), 'Insecure');
    (await client.getOk('/session/members')).statusIs(200).bodyIs('Member: kraih, with extra cookie');
    (await client.getOk('/session/members')).statusIs(200).bodyIs('Member: kraih, with extra cookie');
    (await client.getOk('/session/logout')).statusIs(200).bodyIs('Logout: kraih');
    (await client.getOk('/session/members')).statusIs(200).bodyIs('Member: not logged in, with extra cookie');
  });

  await t.test('Session (different cookie name)', async t => {
    app.session.cookieName = 'myapp-session';
    (await client.getOk('/session/members')).statusIs(200).bodyIs('Member: not logged in, with extra cookie');
    (await client.getOk('/session/login/kraih')).statusIs(200).bodyIs('Login: kraih');
    (await client.getOk('/session/members')).statusIs(200).bodyIs('Member: kraih, with extra cookie');
    t.match(client.res.get('Set-Cookie'), /myapp-session=/);
    (await client.getOk('/session/logout')).statusIs(200).bodyIs('Logout: kraih');
    (await client.getOk('/session/members')).statusIs(200).bodyIs('Member: not logged in, with extra cookie');
  });

  await t.test('Content negotiation', async t => {
    (await client.getOk('/content/negotiation', {headers: {Accept: 'application/json'}})).statusIs(200)
      .typeIs('application/json; charset=utf-8').jsonIs({some: 'JSON'});
    (await client.getOk('/content/negotiation', {headers: {Accept: 'text/html'}})).statusIs(200)
      .typeIs('text/html; charset=utf-8').bodyIs('Some HTML');
    (await client.getOk('/content/negotiation', {headers: {Accept: 'text/plain'}})).statusIs(204).bodyIs('');

    (await client.getOk('/content/negotiation.json')).statusIs(200)
      .typeIs('application/json; charset=utf-8').jsonIs({some: 'JSON'});
    (await client.getOk('/content/negotiation.html')).statusIs(200)
      .typeIs('text/html; charset=utf-8').bodyIs('Some HTML');
    (await client.getOk('/content/negotiation.txt')).statusIs(404);

    (await client.getOk('/content/negotiation.json', {headers: {Accept: 'application/json'}})).statusIs(200)
      .typeIs('application/json; charset=utf-8').jsonIs({some: 'JSON'});
    (await client.getOk('/content/negotiation.html', {headers: {Accept: 'text/html'}})).statusIs(200)
      .typeIs('text/html; charset=utf-8').bodyIs('Some HTML');

    (await client.getOk('/content/negotiation.html', {headers: {Accept: 'application/json'}})).statusIs(200)
      .typeIs('text/html; charset=utf-8').bodyIs('Some HTML');
    (await client.getOk('/content/negotiation.json', {headers: {Accept: 'text/html'}})).statusIs(200)
      .typeIs('application/json; charset=utf-8').jsonIs({some: 'JSON'});

    (await client.getOk('/content/negotiation', {headers: {Accept: 'text/plain, application/json'}})).statusIs(200)
      .typeIs('application/json; charset=utf-8').jsonIs({some: 'JSON'});
    (await client.getOk('/content/negotiation', {headers: {Accept: 'text/plain, application/json, */*'}}))
      .statusIs(200).typeIs('application/json; charset=utf-8').jsonIs({some: 'JSON'});
    (await client.getOk('/content/negotiation', {headers: {Accept: '*/*, application/json'}}))
      .statusIs(200).typeIs('application/json; charset=utf-8').jsonIs({some: 'JSON'});
    (await client.getOk('/content/negotiation', {headers: {Accept: 'application/json, text/html;Q=1.5'}})).statusIs(200)
      .typeIs('text/html; charset=utf-8').bodyIs('Some HTML');

    (await client.getOk('/content/negotiation/fallback', {headers: {Accept: 'application/json'}})).statusIs(200)
      .typeIs('application/json; charset=utf-8').jsonIs({just: 'JSON'});
    (await client.getOk('/content/negotiation/fallback', {headers: {Accept: 'text/plain'}})).statusIs(200)
      .typeIs('text/plain; charset=utf-8').bodyIs('Fallback');
    (await client.getOk('/content/negotiation/fallback')).statusIs(200).typeIs('text/plain; charset=utf-8')
      .bodyIs('Fallback');
  });

  await t.test('Reverse proxy (X-Forwarded-For)', async t => {
    (await client.getOk('/remote_address')).statusIs(200).bodyUnlike(/104\.24\.31\.8/);
    (await client.getOk('/remote_address', {headers: {'X-Forwarded-For': '104.24.31.8'}})).statusIs(200)
      .bodyUnlike(/104\.24\.31\.8/);

    client.server.reverseProxy = true;
    (await client.getOk('/remote_address')).statusIs(200).bodyUnlike(/104\.24\.31\.8/);
    (await client.getOk('/remote_address', {headers: {'X-Forwarded-For': '104.24.31.8'}})).statusIs(200)
      .bodyIs('Address: 104.24.31.8');
    (await client.getOk('/remote_address', {headers: {'X-Forwarded-For': '192.0.2.2, 192.0.2.1'}})).statusIs(200)
      .bodyIs('Address: 192.0.2.1');
    (await client.getOk('/remote_address', {headers: {'X-Forwarded-For': '192.0.2.2,192.0.2.1'}})).statusIs(200)
      .bodyIs('Address: 192.0.2.1');
    client.server.reverseProxy = false;
  });

  await t.test('Reverse proxy (X-Forwarded-Proto)', async t => {
    (await client.getOk('/protocol')).statusIs(200).bodyIs('Protocol: http');
    (await client.getOk('/protocol', {headers: {'X-Forwarded-Proto': 'https'}})).statusIs(200).bodyIs('Protocol: http');

    client.server.reverseProxy = true;
    (await client.getOk('/protocol')).statusIs(200).bodyIs('Protocol: http');
    (await client.getOk('/protocol', {headers: {'X-Forwarded-Proto': 'https'}})).statusIs(200)
      .bodyIs('Protocol: https');
    client.server.reverseProxy = false;
  });

  await t.test('multipart/form-data', async t => {
    (await client.postOk('/form/data', {formData: {first: 'works'}})).statusIs(200)
      .jsonIs({first: 'works', second: 'missing'});

    (await client.postOk('/form/data', {formData: {first: 'One', second: 'Two'}})).statusIs(200)
      .jsonIs({first: 'One', second: 'Two'});

    (await client.postOk('/form/data', {
      formData: {
        first: 'One',
        second: {
          content: 'Two',
          filename: 'test.txt',
          type: 'text/whatever'
        }
      }
    })).statusIs(200).jsonIs({
      first: 'One',
      second: 'missing',
      upload: {content: 'Two', filename: 'test.txt', size: 3, type: 'text/whatever'}
    });
  });

  await t.test('Mixed forms', async t => {
    (await client.postOk('/form/mixed?one=works')).statusIs(200)
      .jsonIs({one: 'works', two: 'missing', three: 'missing'});

    (await client.postOk('/form/mixed', {query: {two: 'works'}})).statusIs(200)
      .jsonIs({one: 'missing', two: 'works', three: 'missing'});

    (await client.postOk('/form/mixed', {form: {three: 'works'}})).statusIs(200)
      .jsonIs({one: 'missing', two: 'missing', three: 'works'});

    (await client.postOk('/form/mixed?one=works', {form: {two: 'too'}})).statusIs(200)
      .jsonIs({one: 'works', two: 'too', three: 'missing'});

    (await client.postOk('/form/mixed?two=works', {formData: {three: 'works'}})).statusIs(200)
      .jsonIs({one: 'missing', two: 'works', three: 'works'});

    (await client.postOk('/form/mixed?two=TWO', {
      formData: {
        three: 'THREE',
        four: {content: 'FOUR', filename: 'test.txt'}
      }
    })).statusIs(200).jsonIs({one: 'missing', two: 'TWO', three: 'THREE', four: {content: 'FOUR'}});
  });

  await t.test('Uploads', async t => {
    (await client.postOk('/form/upload', {formData: {test: {content: 'Hello!', filename: 'test.txt'}}})).statusIs(200);
    const data = JSON.parse(client.body);
    t.equal(data.size, 6);
    t.equal(data.content, 'Hello!');
    t.ok(data.path.startsWith(app.models.uploadDir.toString()));

    (await client.postOk('/form/upload', {formData: {test: {content: 'Hello World!', filename: 'test.txt'}}}))
      .statusIs(400).jsonIs({error: 'Upload limit exceeded'});
  });

  await t.test('Validation', async t => {
    (await client.putOk('/schema/user', {json: {username: 'kraih'}})).statusIs(200).jsonIs({valid: true});
    (await client.putOk('/schema/user', {json: {user: 'kraih'}})).statusIs(200).jsonIs({valid: false});
    (await client.putOk('/schema/user', {json: {username: 'sri'}})).statusIs(200).jsonIs({valid: true});

    t.notOk(app.validator.getSchema('test123'));
    (await client.putOk('/schema/dynamic', {json: {test: 123}})).statusIs(200).jsonIs({valid: true});
    t.ok(app.validator.getSchema('test123'));
    (await client.putOk('/schema/dynamic', {json: {test: '123'}})).statusIs(200).jsonIs({valid: false});

    (await client.putOk('/schema/form', {form: {test: 'works'}})).statusIs(200).jsonIs({valid: true});
    (await client.putOk('/schema/form', {form: {test2: 'fails'}})).statusIs(200).jsonIs({valid: false});

    (await client.putOk('/schema/form', {formData: {test: 'works'}})).statusIs(200).jsonIs({valid: true});
    (await client.putOk('/schema/form', {formData: {test2: 'fails'}})).statusIs(200).jsonIs({valid: false});

    (await client.putOk('/schema/form', {query: {test: 'works'}})).statusIs(200).jsonIs({valid: true});
    (await client.putOk('/schema/form', {query: {test2: 'fails'}})).statusIs(200).jsonIs({valid: false});

    (await client.putOk('/schema/form?test=works')).statusIs(200).jsonIs({valid: true});
    (await client.putOk('/schema/form?test2=fails')).statusIs(200).jsonIs({valid: false});
  });

  t.test('Forbidden helpers', t => {
    let result;
    try {
      app.addHelper('render', function () {});
    } catch (error) {
      result = error;
    }
    t.match(result, /The name "render" is already used in the prototype chain/);

    try {
      app.addHelper('isWebSocket', function () {});
    } catch (error) {
      result = error;
    }
    t.match(result, /The name "isWebSocket" is already used in the prototype chain/);

    t.end();
  });

  await client.stop();
});
