import mojo from '../lib/mojo.js';
import t from 'tap';

t.test('Plugin app', async t => {
  const app = mojo();

  app.plugin(mixedPlugin);

  app.get('/tag_helpers', ctx => ctx.render({inline: tagHelperPlugin}));

  app.get('/helper', ctx => ctx.render({text: ctx.testHelper('test')}));

  app.get('/getter/setter', ctx => {
    const before = ctx.testProp;
    ctx.testProp = 'also works';
    const after = ctx.testProp;
    ctx.render({text: `before: ${before}, after: ${after}`});
  });

  app.get('/method', ctx => ctx.render({text: ctx.testMethod('test')}));

  app.websocket('/websocket/mixed').to(ctx => {
    ctx.on('connection', ws => {
      const before = ctx.testProp;
      ctx.testProp = 'works too';
      const after = ctx.testProp;
      const also = ctx.testHelper('test');
      ws.send(`before: ${before}, after: ${after}, also: ${also}`, () => ws.close());
    });
  });

  const client = await app.newTestClient({tap: t});

  await t.test('Tag helpers', async t => {
    const baseURL = client.server.urls[0] + app.static.prefix.substring(1);
    (await client.getOk('/tag_helpers')).statusIs(200).bodyIs(tagHelperPluginResult(baseURL));
  });

  await t.test('Helper', async t => {
    (await client.getOk('/helper')).statusIs(200).bodyIs('works');
  });

  await t.test('Decorate with getter and setter', async t => {
    (await client.getOk('/getter/setter')).statusIs(200).bodyIs('before: works, after: also works');
  });

  await t.test('Decorate with method', async t => {
    (await client.getOk('/method')).statusIs(200).bodyIs('also works');
  });

  await t.test('WebSocket', async t => {
    await client.websocketOk('/websocket/mixed');
    t.equal(await client.messageOk(), 'before: also works, after: works too, also: works too');
    await client.finishedOk(1005);
  });

  await client.stop();
});

const tagHelperPlugin = `
Favicon: <%- ctx.mojoFaviconTag() %>
Relative script: <%- ctx.scriptTag('/foo/bar.js') %>
Relative style: <%- ctx.styleTag('/foo/bar.css') %>
Absolute script: <%- ctx.scriptTag('https://mojojs.org/public/foo/bar.js') %>
Absolute style: <%- ctx.styleTag('https://mojojs.org/public/foo/bar.css') %>
`;

function tagHelperPluginResult (baseURL) {
  return `
Favicon: <link rel="icon" href="${baseURL}mojo/favicon.ico"></link>
Relative script: <script src="${baseURL}foo/bar.js"></script>
Relative style: <link rel="stylesheet" href="${baseURL}foo/bar.css">
Absolute script: <script src="https://mojojs.org/public/foo/bar.js"></script>
Absolute style: <link rel="stylesheet" href="https://mojojs.org/public/foo/bar.css">
`;
}

function mixedPlugin (app) {
  app.config.test = 'works';

  app.addHelper('testHelper', (ctx, name) => ctx.config[name]);

  app.decorateContext('testMethod', function (name) {
    return this.config[name];
  });

  app.decorateContext('testProp', {
    get: function () {
      return this.config.test;
    },
    set: function (value) {
      this.config.test = value;
    }
  });
}
