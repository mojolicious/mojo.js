<p align="center">
  <a href="https://mojojs.org">
    <img src="https://github.com/mojolicious/mojo.js/blob/main/docs/logo.png?raw=true" style="margin: 0 auto;">
  </a>
</p>

[![](https://github.com/mojolicious/mojo.js/workflows/test/badge.svg)](https://github.com/mojolicious/mojo.js/actions)

[Mojolicious](https://mojolicious.org) for Node.js. This project is still **under heavy development** and not ready
for production use yet. If you want to help out, you're welcome to join us on
[IRC](https://webchat.freenode.net/#mojo.js) (`#mojo.js` on Freenode).

```js
import mojo from '@mojojs/mojo';

const app = mojo();

app.get('/', ctx => ctx.render({text: 'Hello Mojo!'}));

app.start();
```

Use the command system to start your web server.

```
$ node index.js server --help
...

$ node index.js server
[77264] Web application available at http://127.0.0.1:3000/
```

Batteries included. This real-time web framework will not only provide a very high level of performance, it will also
include everything you need to build sophisticated web services.

```js
import mojo from '@mojojs/mojo';

const app = mojo();

app.get('/', ctx => {
  ctx.render({inline: inlineTemplate});
});

app.websocket('/title', ctx => {
  ctx.on('connection', ws => {
    ws.on('message', async url => {
      const res   = await ctx.client.get(url);
      const html  = await res.html();
      const title = html('title').text();
      ws.send(title);
    });
  });
});

app.start();

const inlineTemplate = `
<script>
  const ws = new WebSocket('<%= ctx.urlFor('title') %>');
  ws.onmessage = event => { document.body.innerHTML += event.data };
  ws.onopen    = event => { ws.send('https://mojolicious.org') };
</script>
`;
```

But the examples above are just simplified single file apps. We use those for prototyping and to shorten examples in
documentation. Real applications use a proper MVC architecture with a clean directory structure.

```
|-- controllers
|   |-- bar.js
|   `-- foo.js
|-- models
|   `-- users.js
|-- public
|   `-- test.txt
|-- views
|   |-- foo
|   |   `-- bar.html.ejs
|   `-- foo.html.ejs
`-- index.js
```

More documentation will follow very soon, as the project moves closer to the 1.0 release. We are aiming for the same
level of quality you would expect from [Mojolicious](https://mojolicious.org) itself.

## Install

    $ npm install @mojojs/mojo
