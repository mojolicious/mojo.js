<p align="center">
  <a href="https://mojojs.org">
    <img src="https://github.com/mojolicious/mojo.js/blob/main/docs/logo.png?raw=true" style="margin: 0 auto;">
  </a>
</p>

[![](https://github.com/mojolicious/mojo.js/workflows/test/badge.svg)](https://github.com/mojolicious/mojo.js/actions)

Mojolicious for JavaScript. **Experimental!**

```js
import mojo from '@mojojs/core';

const app = mojo();

app.get('/hello', ctx => ctx.render({text: 'Hello Mojo!'}));

app.put('/json', async ctx => {
  const data = await ctx.req.json();
  data.hello = 'Mojo!';
  ctx.render({json: data});
});

app.start();

```
