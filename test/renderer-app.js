import mojo from '../lib/core.js';
import t from 'tap';

t.test('Renderer app', async t => {
  const app = mojo();

  t.equal(app.log.level, 'trace');
  app.log.level = 'fatal';

  app.renderer.addEngine('test', {
    render() {
      return Buffer.from('Hello Test!');
    }
  });

  app.renderer.addEngine('custom', {
    render: (ctx, options) => {
      return Buffer.from(`Custom ${options.inline}`);
    }
  });

  app.renderer.addEngine('broken', {
    render: () => {
      throw new Error('Broken engine');
    }
  });

  app.get('/custom', ctx => ctx.render({inline: 'test', engine: 'custom'}));

  app.get('/broken', ctx => ctx.render({engine: 'broken'}));

  app.get('/missing', ctx => ctx.render({view: 'does_not_exist'}));

  app
    .get('/inline/layout')
    .to(ctx => ctx.render({inline: inlineTemplate, inlineLayout: inlineLayout}, {what: 'works'}));

  const ua = await app.newTestUserAgent({tap: t});

  await t.test('Custom engine', async () => {
    (await ua.getOk('/custom')).statusIs(200).bodyLike(/Custom test/);
  });

  await t.test('Broken engine', async () => {
    (await ua.getOk('/broken')).statusIs(500).bodyLike(/Broken engine/);
  });

  await t.test('Missing view', async () => {
    (await ua.getOk('/missing')).statusIs(500).bodyLike(/Nothing could be rendered/);
  });

  await t.test('Inline layout', async () => {
    (await ua.getOk('/inline/layout')).statusIs(200).bodyLike(/Header: Test.+this works.+Footer/s);
  });

  await t.test('Rendering order', async t => {
    const ctx = app.newMockContext();
    t.equal(await ctx.renderToString({engine: 'test'}), 'Hello Test!');
    t.same(await ctx.renderToString({view: 'does-not-exist', engine: 'test'}), null);
    t.same(await ctx.renderToString({engine: 'does-not-exist'}), null);
    t.same(await ctx.renderToString({inline: 'failed', engine: 'does-not-exist'}), null);
  });

  await t.test('Missing view', async t => {
    const ctx = app.newMockContext();
    let result;
    try {
      await ctx.renderToString({engine: 'tmpl'});
    } catch (error) {
      result = error;
    }
    t.match(result, /viewPath is not defined for tmplEngine/);
  });

  await ua.stop();
});

const inlineTemplate = `
<% stash.title = 'Test'; %>
this <%= what %>
`;

const inlineLayout = `
Header: <%= title %>
<%= ctx.content.main %>
Footer
`;
