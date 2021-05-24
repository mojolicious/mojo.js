# Cheatsheet

A quick overview of the most important [mojo.js](https://mojojs.org) objects.

## App

The mojo.js application object.

```js
// client: a `mojo.Client` object for use inside the application
const res = app.client.get('https://mojolicious.org');

// config: plain configuration object, filled with data by config plugins, use it to to store arbitrary information
app.config.foo = 'bar';
const foo = app.config.foo;

// home: a `mojo.File` object with the path of the application home directory
const path = app.home.child('config.json').toString();
const content = app.home.child('views', 'foo.html.ejs').readFile('utf8');
```

### Context

The main object representing an HTTP request or WebSocket handshake.

```js
// req: the request object
const req = ctx.req;
const url = ctx.req.url;

// res: the response object
const res = ctx.res;
ctx.res.status(200).type('test.html').send('Hello World!');

// render: render a response
ctx.render({text: 'Hello World!'});
ctx.render({json: {hello: 'world'}});
```

### Request

The `req` property of the [context](#Context) object.

```js
// raw: the raw `http.IncomingMessage` object
const version = ctx.req.raw.httpVersion;

// method: HTTP request method
const method = ctx.req.method;

// url: a `URL` object with full request URL (protocol might be from the X-Forwarded-Proto header)
const url = ctx.req.url;

// remoteAddress: the client address (may be from the X-Forwarded-For header)
const address = ctx.req.remoteAddress;

// userinfo: Basic authentication data
const userinfo = ctx.req.userinfo;

// requestId: reasonably unique request id
const requestId = ctx.req.requestId;

// get: request headers
const accept = ctx.req.get('Accept');

// getCookie: get cookie values
const cookie = ctx.req.getCookie('foo');

// text: retrieve request body as a string
const content = await ctx.req.text();

// buffer: retrieve request body as a `Buffer`
const buffer = await ctx.req.buffer();

// pipe: pipe request body to `stream.Writable` object
await ctx.req.pipe(process.stdout);
```

### Response

The `res` property of the [context](#Context) object.

```js
// raw: the raw `http.ServerResponse` object
const isFinished = ctx.res.raw.writableFinished;

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

// send: send response (with `stream.Readable` object as response body or without a body)
ctx.res.send(stream);
ctx.res.send();
```
