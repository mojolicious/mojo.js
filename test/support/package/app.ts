import assert from 'node:assert/strict';
import mojo, {type MojoContext} from '@mojojs/core';

const app = mojo({mode: 'production'});

app.get('/', async (ctx: MojoContext) => {
  const name: string = ctx.req.query.get('name') ?? 'TypeScript';
  await ctx.render({text: `Hello ${name}!`});
});

const ua = await app.newTestUserAgent();
const res = await ua.get('/');
assert.equal(res.statusCode, 200);
assert.equal(await res.text(), 'Hello TypeScript!');
await ua.stop();

console.log('TypeScript consumer works');
