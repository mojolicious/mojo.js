/*
 * Minimal single-process WebSocket chat application for browser testing
 */
import {EventEmitter} from 'node:events';
import mojo from '../lib/core.js';

export const app = mojo();

app.models.events = new EventEmitter();
app.models.events.setMaxListeners(1000);

app.get('/', async ctx => {
  await ctx.render({inline: inlineTemplate});
});

app.websocket('/channel', async ctx => {
  ctx.plain(async ws => {
    const listener = msg => ws.send(msg);
    ctx.models.events.on('mojochat', listener);

    for await (const msg of ws) {
      ctx.models.events.emit('mojochat', msg);
    }

    ctx.models.events.removeListener('mojochat', listener);
  });
});

app.start();

const inlineTemplate = `
<form onsubmit="sendChat(this.children[0]); return false"><input></form>
<div id="log"></div>
<script>
  const ws = new WebSocket('<%= ctx.urlFor('channel') %>');
  ws.onmessage = function (e) {
    document.getElementById('log').innerHTML += '<p>' + e.data + '</p>';
  };
  function sendChat(input) { ws.send(input.value); input.value = '' }
</script>
`;
