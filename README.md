<p align="center">
  <a href="https://mojojs.org">
    <img src="https://github.com/mojolicious/mojo.js/blob/main/docs/images/logo.png?raw=true" style="margin: 0 auto;">
  </a>
</p>

[![](https://github.com/mojolicious/mojo.js/workflows/test/badge.svg)](https://github.com/mojolicious/mojo.js/actions)
[![npm](https://img.shields.io/npm/v/@mojojs/core.svg)](https://www.npmjs.com/package/@mojojs/core)

The [Mojolicious](https://mojolicious.org) real-time web framework for [Node.js](https://nodejs.org/). Written in
TypeScript. If you want to stay up to date on the latest developments join us on [IRC](https://web.libera.chat/#mojo.js)
(`#mojo.js` on Libera.Chat).

## Features

  * An amazing **backend** framework, allowing you to easily grow single file prototypes into well-structured MVC web
    applications.
    * Powerful out of the box with RESTful routes, WebSockets, HTTP/HTTPS user agent, plugins, commands, templates,
      content negotiation, cookies, session management, multipart forms, form and JSON validation, testing framework,
      HTML/XML parser, static file server, MIME types, logger, first class Unicode support and much more for you to
      discover.
    * Everything you need to build cloud-native microservices for state of the art container environments.
    * No default Model. Just use your favorite database. We like [PostgreSQL](https://www.postgresql.org) and
      [Knex.js](http://knexjs.org).
    * No default frontend framework. Pair it with [React](https://reactjs.org) or [Vue](https://vuejs.org) for a great
      development experience.
  * Batteries included, yet faster than Express and Koa.
  * Designed for modern JavaScript, with `async`/`await`, classes and ES modules.
  * Actively maintained by a team with more than 20 years of experience developing mainstream web frameworks such as
    [Mojolicious](https://mojolicious.org) and [Catalyst](http://www.catalystframework.org).

## Installation

All you need is Node.js 16.0.0 (or newer).

```
$ npm install @mojojs/core
```

## Getting Started

  These four lines are a whole web application.

```js
import mojo from '@mojojs/core';

const app = mojo();

app.get('/', ctx => ctx.render({text: 'I ♥ Mojo!'}));

app.start();
```

  Use the built-in command system to start your web server.

```
$ node index.mjs server
[77264] Web application available at http://127.0.0.1:3000/
```

  Test it with any HTTP client you prefer.

```
$ curl http://127.0.0.1:3000/
I ♥ Mojo!
```

## Duct tape for the HTML5 web

  Use all the latest Node.js and HTML features in convenient single file prototypes like this one, and grow them easily
  into well-structured **Model-View-Controller** web applications.

```js
import mojo from '@mojojs/core';

const app = mojo();

app.get('/', async ctx => {
  await ctx.render({inline: inlineTemplate});
});

app.websocket('/title', ctx => {
  ctx.plain(async ws => {
    for await (const url of ws) {
      const res   = await ctx.ua.get(url);
      const html  = await res.html();
      const title = html('title').text();
      ws.send(title);
    }
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

## Want to know more?

Take a look at our [documentation](https://github.com/mojolicious/mojo.js/tree/main/docs)!
