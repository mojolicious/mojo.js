<p align="center">
  <a href="https://mojojs.org">
    <img src="https://github.com/mojolicious/mojo.js/blob/main/docs/logo.png?raw=true" style="margin: 0 auto;">
  </a>
</p>

## Secret project, do not share!

```js
import mojo from '@mojojs/core';

const app = mojo();

app.get('/hello', ctx => ctx.render({text: 'Hello Mojo!'}));

app.start();

```
