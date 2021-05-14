import mojo from '../lib/mojo.js';
import t from 'tap';

t.test('Renderer app', async t => {
  const app = mojo();

  app.log.level = 'fatal';

  app.renderer.addEngine('custom', (ctx, options) => {
    return Buffer.from(`Custom ${options.inline}`);
  });

  app.renderer.addEngine('broken', () => {
    throw new Error('Broken engine');
  });

  app.get('/custom', ctx => ctx.render({inline: 'test', engine: 'custom'}));

  app.get('/broken', ctx => ctx.render({engine: 'broken'}));

  app.get('/missing', ctx => ctx.render({view: 'does_not_exist'}));

  const client = await app.newTestClient({tap: t});

  await t.test('Custom engine', async t => {
    (await client.getOk('/custom')).statusIs(200).bodyLike(/Custom test/);
  });

  await t.test('Broken engine', async t => {
    (await client.getOk('/broken')).statusIs(500).bodyLike(/Broken engine/);
  });

  await t.test('Missing view', async t => {
    (await client.getOk('/missing')).statusIs(500).bodyLike(/Nothing could be rendered/);
  });

  await client.stop();
});
