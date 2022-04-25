# Cheatsheet

A quick overview of the most important [mojo.js](https://mojojs.org) objects.

## App

The mojo.js application object, usually called `app`.

```js
// ua: a `UserAgent` object for use inside the application
const res = await app.ua.get('https://mojolicious.org');
const dom = await res.html();
const title = dom.at('title').text();

// config: plain configuration object, filled with data by config plugins, use it to to store arbitrary information
app.config.foo = 'bar';
const foo = app.config.foo;

// home: a `Path` object with the path of the application home directory
const path = app.home.child('config.json').toString();
const content = app.home.child('views', 'foo.html.mt').readFile('utf8');

// models: plain object, use it to store arbitray models
app.models.frameworks = [{name: 'Catalyst'}, {name: 'Mojolicious'}, {name: 'mojo.js'}];

// log: the application logger
const child = app.log.child({someContextValue: 123, anotherContextValue: 'test'});
child.debug('Shut up and take my money!');
```

The `router` is the most commonly used application property and there are various shortcut methods for it.

```js
// Create routes to controllers
app.router.get('/users/:id').to('#users#show');

// Create routes to controllers via shortcut method
app.get('/users/:id').to('users#show');

// Add placeholder types
app.router.addType('futuramaName', ['bender', 'leela']);

// Create routes directly to actions
app.any('/hello/<name:futuramaName>', ctx => ctx.render({text: `Hello ${ctx.stash.name}`}));
```

### Context

The main object representing an HTTP request or WebSocket handshake, usually called `ctx`.

```js
// req: the request object
const path = ctx.req.path;

// res: the response object
await ctx.res.status(200).type('text/html').send('Hello World!');

// params: all form parameters combined
const params = await ctx.params();
const foo = params.get('foo');

// urlFor: generate URLs for routes
const url = ctx.urlFor('index');

// urlForFile: generate URLs for static files
const url = ctx.urlForFile('foo/app.css');

// log: log messages with request id as context
ctx.log.debug('Shut up and take my money!');

// session: encrypted cookie based session
const session = await ctx.session();
session.user = 'kraih';
const user = session.user;

// config: access application config
const foo = ctx.config.foo;

// models: access application models
const users = ctx.models.users;

// app: the mojo.js application object
const app = ctx.app;
```

The `ctx.render()` method is the most common way to generate a response.

```js
// Create a response from a string
await ctx.render({text: 'Hello World!'});

// Create a JSON response from a data structure
await ctx.render({json: {hello: 'world'}});

// Create a YAML response from a data structure
await ctx.render({yaml: {hello: 'world'}});

// Create a response by rendering the view "views/foo/bar.*.*"
await ctx.render({view: 'foo/bar'});

// Create a response by rendering an inline view (mt by default)
await ctx.render({inline: 'Hello <%= name %>'}, {name: 'Mojo'});

// Render something, but return it as a string
const json = await ctx.renderToString({json: {hello: 'world'}});
```

### Request

The `ctx.req` property of the [context](#Context) object. All URLs use
[URL](https://nodejs.org/api/url.html#url_the_whatwg_url_api) objects and form parameters
[URLSearchParams](https://nodejs.org/api/url.html#url_class_urlsearchparams) objects.

```js
// method: HTTP request method
const method = ctx.req.method;

// path: request path
const path = ctx.req.path;

// baseURL: base URL for request (protocol might be from the X-Forwarded-Proto header)
const baseURL = ctx.req.baseURL;

// ip: the client IP address (may be from the X-Forwarded-For header)
const address = ctx.req.ip;

// userinfo: Basic authentication data
const userinfo = ctx.req.userinfo;

// requestId: reasonably unique request id
const requestId = ctx.req.requestId;

// get: request headers
const accept = ctx.req.get('Accept');

// getCookie: get cookie values
const cookie = ctx.req.getCookie('foo');

// query: query parameters
const params = ctx.req.query();
```

There are multiple methods to receive the request content in various formats.

```js
// Retrieve request body as a string
const text = await ctx.req.text();

// Retrieve request body as a `Buffer`
const buffer = await ctx.req.buffer();

// Retrieve "application/x-www-form-urlencoded" or "multipart/form-data" form parameters
const params = await ctx.req.form();

// Pipe request body to `stream.Writable` object
await ctx.req.pipe(process.stdout);

// Retrieve request body from async iterator
const parts = [];
for await (const chunk of ctx.req) {
  parts.push(chunk);
}
const buffer = Buffer.concat(parts);
```

### Response

The `ctx.res` property of the [context](#Context) object.

```js
// status: set response code
ctx.res.status(200);

// set: set response headers
ctx.res.set('Server', 'Mojo/1.0');

// type: set "Content-Type" header
ctx.res.type('quote/futurama');

// length: set "Content-Length" header
ctx.res.length(12);

// setCookie: set cookie
ctx.res.setCookie('user', 'Bender', {path: '/', httpOnly: true});
```

The `ctx.res.send()` method is used to actually send the response.

```js
// Send response with `stream.Readable` object as body
await ctx.res.status(200).send(stream);

// Send response with a string as body
await ctx.res.status(200).type('text/plain').length(12).send('Hello World!');

// Send response without a body
await ctx.res.status(204).send();
```

## Support

If you have any questions the documentation might not yet answer, don't hesitate to ask in the
[Forum](https://github.com/mojolicious/mojo.js/discussions), on [Matrix](https://matrix.to/#/#mojo:matrix.org), or
[IRC](https://web.libera.chat/#mojo).
