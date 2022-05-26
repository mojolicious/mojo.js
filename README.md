<p align="center">
  <a href="https://mojojs.org">
    <picture>
      <source srcset="https://github.com/mojolicious/mojo.js/blob/main/docs/images/logo-dark.png?raw=true" media="(prefers-color-scheme: dark)">
      <img src="https://github.com/mojolicious/mojo.js/blob/main/docs/images/logo.png?raw=true" style="margin: 0 auto;">
    </picture>
  </a>
</p>

[![](https://github.com/mojolicious/mojo.js/workflows/test/badge.svg)](https://github.com/mojolicious/mojo.js/actions)
[![npm](https://img.shields.io/npm/v/@mojojs/core.svg)](https://www.npmjs.com/package/@mojojs/core)

The [Mojolicious](https://mojolicious.org) real-time web framework for [Node.js](https://nodejs.org/). Written in
TypeScript. Meticulously designed for hypermedia-driven backend web services using all the latest JavaScript features.

If you want to stay up to date on the latest developments join us on [Matrix](https://matrix.to/#/#mojo:matrix.org) or
[IRC](https://web.libera.chat/#mojo).

## Features

* A real-time web framework, allowing you to easily grow single file prototypes into well-structured MVC web
  applications.
  * Powerful out of the box with RESTful routes, WebSockets, plugins, commands, logging, templates, content negotiation,
    session management, form and JSON validation, testing framework, static file server, cluster mode, CGI detection,
    first class Unicode support and much more for you to discover.

* A powerful web development toolkit, that you can use for all kinds of applications, independently of the web
  framework.
  * High performance HTTP and WebSocket client/server implementation with support for HTTPS/WSS, cookies, redirects,
    urlencoded/multi-part forms, file uploads, JSON/YAML, HTML/XML, mocking, API testing, HTTP/SOCKS proxies, and gzip
    compression.
  * HTML/XML parser with CSS selector support.

* Very clean, `class` and `async`/`await` based API, written in TypeScript, with very few requirements to avoid NPM
  dependency hell and allow for "Perl-grade" long term support.

* Fresh code based upon decades of experience developing [Mojolicious](https://mojolicious.org) and
  [Catalyst](http://catalyst.perl.org), free and open source.

## Installation

All you need is Node.js 16.0.0 (or newer).

```
$ npm install @mojojs/core
```

Maybe take a look at our high quality spin-off projects [@mojojs/dom](https://www.npmjs.com/package/@mojojs/dom),
[@mojojs/template](https://www.npmjs.com/package/@mojojs/template) and
[@mojojs/path](https://www.npmjs.com/package/@mojojs/path).

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

## Duct Tape for the Web

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
      const title = html.at('title').text();
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
