import assert from 'node:assert/strict';
import mojo from '@mojojs/core';

const app = mojo({mode: 'production'});

app.get('/', ctx => ctx.render({text: 'Hello JavaScript!'}));

const ua = await app.newTestUserAgent();
const res = await ua.get('/');
assert.equal(res.statusCode, 200);
assert.equal(await res.text(), 'Hello JavaScript!');
await ua.stop();

console.log('JavaScript consumer works');
