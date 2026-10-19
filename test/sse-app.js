import mojo from '../src/core.ts';
import t from 'tap';

t.test('SSE app', async t => {
  const app = mojo();

  if (app.mode === 'development') app.log.level = 'debug';

  app.get('/events', async ctx => {
    await ctx.writeSSE({comment: 'Keep connection alive!'});
    await ctx.writeSSE({id: 23, type: 'greeting', text: 'Hello World!'});
    await ctx.writeSSE({text: 'I ♥ Mojolicious!'});
    await ctx.writeSSE({id: 24, type: 'farewell', text: 'Goodbye\nWorld!'});
    ctx.finishSSE();
  });

  let finished = false;
  app.post('/push', async ctx => {
    const name = await ctx.req.text();
    await ctx.writeSSE();
    let i = 1;
    const timer = setInterval(() => ctx.writeSSE({id: i, text: `${name} ${i++}`}), 50);
    ctx.on('finish', () => {
      clearInterval(timer);
      finished = true;
    });
  });

  const ua = await app.newTestUserAgent({tap: t});

  await t.test('Events', async () => {
    (await ua.getSSEOk('/events')).statusIs(200).typeIs('text/event-stream');
    (await ua.sseOk()).sseIdIs('23').sseTypeIs('greeting').sseTextIs('Hello World!');
    (await ua.sseOk()).sseIdIs(null).sseTypeIs('message').sseTextIs('I ♥ Mojolicious!');
    (await ua.sseOk())
      .sseIdIs('24')
      .sseIdIsnt('23')
      .sseTypeIs('farewell')
      .sseTypeIsnt('message')
      .sseTextIs('Goodbye\nWorld!')
      .sseTextIsnt('Hello World!')
      .sseTextLike(/Goodbye/)
      .sseTextUnlike(/Hello/);
    await ua.sseFinishedOk();
  });

  await t.test('Close connection', async t => {
    (await ua.postSSEOk('/push', {body: 'push'})).statusIs(200).typeIs('text/event-stream');
    (await ua.sseOk()).sseIdIs('1').sseTextIs('push 1');
    (await ua.sseOk()).sseIdIs('2').sseTextIs('push 2');
    await ua.sseFinishOk();
    while (finished === false) await new Promise(resolve => setTimeout(resolve, 10));
    t.equal(finished, true);
  });

  await t.test('User-agent', async t => {
    const res = await ua.get('/events');
    const events = [];
    for await (const event of res.sse()) events.push(event);
    t.same(events, [
      {id: '23', type: 'greeting', text: 'Hello World!'},
      {id: null, type: 'message', text: 'I ♥ Mojolicious!'},
      {id: '24', type: 'farewell', text: 'Goodbye\nWorld!'}
    ]);
  });

  await ua.stop();
});
