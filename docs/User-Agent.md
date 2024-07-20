
# User-Agent

The [mojo.js](https://mojojs.org) toolkit contains a full featured HTTP and WebSocket user-agent. And while its primary
purpose is integration testing of web applications, it can also be used for many other things.

```js
import {UserAgent} from '@mojojs/core';

const ua = new UserAgent();
const res = await ua.get('https://mojolicious.org');
const content = await res.text();
```

The API is heavily inspired by the [Fetch Standard](https://fetch.spec.whatwg.org) and should feel familar if you've
used `fetch` before.

### User-Agent Options

The user-agent can be initialized with a few options, but none of them are required.

```js
const ua = new UserAgent({

  // Base URL to be used to resolve all relative request URLs with
  baseURL: 'http://127.0.0.1:3000',

  // Maximum number of redirects to follow, default to none
  maxRedirects: 5,

  // Name of user-agent to send with `User-Agent` header
  name: 'mojoUA/1.0'
});
```

### Request Config

Every request is represented by a config object that contains various properties to describe every part of the HTTP
request.

```js
const res = await ua.request({

  // HTTP method for request
  method: 'GET',

  // URL of request target as a string or URL object, may be be relative to `ua.baseURL`
  url: new URL('https://mojolicious.org'),

  // Headers to include in request
  headers: {Accept: '*/*', Authorization: 'token 123456789abcdef'},

  // Object with key/value pairs to be sent with the query string
  query: {fieldA: 'first value', fieldB: 'second value'},

  // Request body as a string, `Buffer` or `stream.Readable` object
  body: 'Some content to send with request',

  // Data structure to be sent in JSON format, or for WebSockets a `true` value to enable JSON mode
  json: {hello: ['world']},

  // Data structure to be sent in YAML format
  yaml: {hello: ['world']},

  // Object with key/value pairs to be sent in `application/x-www-form-urlencoded` format
  form: {fieldA: 'first value', fieldB: 'second value'},

  // Object with key/value pairs and a file upload to be sent in `multipart/form-data` format
  formData: {fieldA: 'first value', fieldB: 'second value', fieldC: {content: 'Hello Mojo!', filename: 'test.txt'}},

  // Basic authentication
  auth: 'user:password',

  // Disable TLS certificate validation
  insecure: true,

  // Override the trusted CA certificates (defaults to CAs curated by Mozilla that ship with Node)
  ca: ['...', '...'],

  // Server name for the SNI (Server Name Indication) TLS extension
  servername: 'localhost',

  // Path to UNIX domain socket (UNIX only)
  socketPath: '/var/lib/run/myapp.sock',

  // An `AbortSignal` to abort the request
  signal: controller.signal,

  // Alternative `http.Agent` object to use, for keep-alive or SOCKS proxy support with `proxy-agent`
  // (this API is likely to change in mojo.js 2.0)
  agent: new http.Agent({keepAlive: true})
});
```

The `request` method returns a `Promise` that resolves with a response object, right after the response
status line and headers have been received. But before any data from the response body has been read, which can be
handled in a separate step later on. **Be aware:** The agent API is likely to change in mojo.js 2.0 to improve
compatibility with [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) based backends.

### Request Shortcuts

Since every request includes at least `method` and `url` values, there are HTTP method specific shortcuts you can use
instead of `request`.

```js
const res = await ua.delete('https://mojolicious.org');
const res = await ua.get('https://mojolicious.org');
const res = await ua.head('https://mojolicious.org');
const res = await ua.options('https://mojolicious.org');
const res = await ua.patch('https://mojolicious.org');
const res = await ua.post('https://mojolicious.org');
const res = await ua.put('https://mojolicious.org');
```

All remaining config values can be passed with a second argument to any one of the shortcut methods.

```js
const res = await ua.post('/search', {form: {q: 'mojo'}});
```

### Response Headers

Status line information and response headers are available right away with the response object.

```js
// Status code and message
const statusCode = res.statusCode;
const statusMessage = res.statusMessage;

// Headers
const contentType = res.get('Content-Type');

// 2xx
const isSuccess = res.isSuccess;

// 3xx
const isRedirect = res.isRedirect;

// 4xx
const isClientError = res.isClientError;

// 5xx
const isServerError = res.isServerError;

// 4xx or 5xx
const isError = res.isError;
```

### Response Body

The reponse body can be received in various formats. Most of them will result once again in a new `Promise`, resolving
to different results however.

```js
// String
const text = await res.text();

// Buffer
const buffer = await res.buffer();

// Pipe content to `stream.Writable` object
await res.pipe(process.stdout);

// Parsed JSON
const data = await res.json();

// Parsed YAML
const data = await res.yaml();

// Parsed HTML via `@mojojs/dom`
const dom = await res.html();
const title = dom.at('title').text();

// Parsed XML via `@mojojs/dom`
const dom = await res.xml();

// Async iterator
const parts = [];
for await (const chunk of res) {
  parts.push(chunk);
}
const buffer = Buffer.concat(parts);
```

For HTML and XML parsing [@mojojs/dom](https://www.npmjs.com/package/@mojojs/dom) will be used. Making it very easy to
extract information from documents with just a CSS selector and almost no code at all.

### Cookies

By default a [tough-cookie](https://www.npmjs.com/package/tough-cookie) based cookie jar will be used for state keeping,
and you can reconfigure it however you like.

```js
ua.cookieJar.storage.allowSpecialUseDomain = true;
```

Of course you can also just disable cookies completely.

```js
const ua = new UserAgent({cookieJar: null});
```

### Timeouts

You can use an `AbortController` to make sure a request does not take longer than a certain amount of time. Once
aborted the promise returned by `ua.get()` will reject.

```js
const controller = new AbortController();
const signal = controller.signal;
setTimeout(() => controller.abort(), 3000);
const res = await ua.get('https://mojojs.org', {signal});
```

### WebSockets

For WebSocket handshakes there are also quite a few options available.

```js
const ws = await ua.websocket('wss://mojolicious.org', {

  // Headers to include in handshake
  headers: {Accept: '*/*', Authorization: 'token 123456789abcdef'},

  // Object with key/value pairs to be sent with the query string
  query: {fieldA: 'first value', fieldB: 'second value'},

  // Enable JSON mode (encoding and decoding all messages automatically)
  json: true,

  // Basic authentication
  auth: 'user:password',

  // WebSocket subprotocols
  protocols: ['foo', 'bar'],

  // Path to UNIX domain socket (UNIX only)
  socketPath: '/var/lib/run/myapp.sock'
});
```

You can choose between multiple API styles.

```js
// Async iterator
const ws = await ua.websocket('/ws');
await ws.send('something');
for await (const message of ws) {
  console.log(message);
}

// Events (this API is likely to change in mojo.js 2.0)
const ws = await ua.websocket('/ws');
await ws.send('something');
ws.on('message', message => {
  console.log(message);
});
```

With support for `ping` and `pong` frames. **Be aware:** The event based API is likely to change in mojo.js 2.0 to
imporve browser compatibility.

```js
// Handshake with authentication headers (this API is likely to change in mojo.js 2.0)
const ws = await ua.websocket('/ws', {headers: {Authorization: 'token 123456789abcdef'}});
ws.on('ping', data => {
  ws.pong(data);
});
```

Cookies from the cookie jar will of course also be available for the handshake, so you can rely on them for things like
authentication.

### Hooks

Hooks can be used to extend the user-agent and run code for every HTTP request or WebSocket handshake.

```js
// Add a header to every HTTP request
ua.addHook('request', async (ua, config) => {
  config.headers['X-Bender'] = 'Bite my shiny metal ass!';
});

// Add a query parameter to every WebSocket handshake
ua.addHook('websocket', async (ua, config) => {
  config.url.searchParams.append('hello', 'mojo');
});
```

### Testing

For web application testing there is also a more specialised subclass available that adds various test methods using
[assert](https://nodejs.org/api/assert.html) to integrate seamlessly into most testing frameworks.

```js
import {TestUserAgent} from '@mojojs/core';

const ua = new TestUserAgent({baseURL: 'https://mojolicious.org'});
(await ua.getOk('/')).statusIs(200).headerLike('Content-Type', /html/).bodyLike(/Mojolicious/);
```

[tap](https://www.npmjs.com/package/tap) subtests are also supported, and scope changes can be managed automatically
with the `tap` option.

```js
import {TestUserAgent} from '@mojojs/core';
import t from 'tap';

t.test('Mojolicious', async t => {
  const ua = new TestUserAgent({baseURL: 'https://mojolicious.org', tap: t});

  await t.test('Index', async t => {
    (await ua.getOk('/')).statusIs(200).bodyLike(/Mojolicious/);
  });
});
```

And to test [mojo.js](https://mojojs.org) web applications there is no need to mock anything. The test user-agent can
automatically start and manage a web server listening to a random port for you.

```js
import {app} from '../index.js';
import t from 'tap';

t.test('Example application', async t => {
  const ua = await app.newTestUserAgent({tap: t});

  await t.test('Index', async t => {
    (await ua.getOk('/')).statusIs(200).bodyLike(/mojo.js/);
  });

  await ua.stop();
});
```

There are test alternatives for all HTTP method shortcuts.

```js
await ua.deleteOk('/foo');
await ua.getOk('/foo', {headers: {Host: 'mojolicious.org'}});
await ua.headOk('/foo', {headers: {Accept: '*/*'}});
await ua.optionsOk('/foo', {auth: 'kraih:s3cret'});
await ua.patchOk('/foo', {formData: {role: 'admin'}});
await ua.postOk('/foo', {body: Buffer.from('Hello Mojo!')});
await ua.putOk('/foo', {json: {hello: 'world'}});

await ua.websocketOk('/ws', {protocols: ['test/1', 'test/2']});
```

All test methods return the user-agent object again to allow for easy method chaining and all state is stored inside the
user-agent object.

```js
// Status tests
(await ua.getOk('/foo'))
  .statusIs(200);

// Header tests
(await ua.getOk('/foo'))
  .typeIs('text/html')
  .typeLike(/html/)
  .headerIs('Content-Type', 'text/html')
  .headerLike('Content-Type', /html/)
  .headerExists('Content-Type')
  .headerExistsNot('X-Test');

// Body tests
(await ua.getOk('/foo'))
  .bodyIs('Hello World!')
  .bodyLike(/Hello/)
  .bodyUnlike(/Bye/);

// JSON tests
(await ua.getOk('/foo'))
  .jsonIs({hello: 'world'})
  .jsonIs('world', '/hello');

// YAML tests
(await ua.getOk('/foo'))
  .yamlIs({hello: 'world'})
  .yamlIs('world', '/hello');

// HTML tests
(await ua.getOk('/foo'))
  .elementExists('head > title')
  .elementExistsNot('body #error')
  .textLike('head > title', /Welcome/)
  .textUnlike('head > title', /Bye/);
```

Testing WebSockets is almost as easy, but all operations are async and have to return a `Promise`.

```js
await ua.websocketOk('/echo');
await ua.sendOk('hello');
assert.equal(await ua.messageOk(), 'echo: hello');
await ua.closeOk(4000);
await ua.closedOk(4000);
```

If you're using TypeScript we also support explicit resource management with `await using` for a little less
boilerplate.

```ts
import {app} from '../index.js';
import t from 'tap';

t.test('Example application', async t => {
  await using ua = await app.newTestUserAgent({tap: t});

  await t.test('Index', async t => {
    (await ua.getOk('/')).statusIs(200).bodyLike(/mojo.js/);
  });
});
```

And while the test user-agent is very efficient for testing backend services, for frontend testing we recommend
combining it with [playwright](https://www.npmjs.com/package/playwright).

### Introspection

You can set the `MOJO_CLIENT_DEBUG` environment variable to get some advanced diagnostics information printed to
`stderr`.

```
$ MOJO_CLIENT_DEBUG=1 node myapp.js
-- Client >>> Server
GET / HTTP/1.1\x0d
Accept-Encoding: gzip\x0d
Host: 127.0.0.1:3000\x0d
Connection: close\x0d
\x0d
-- Client <<< Server
HTTP/1.1 200 OK\x0d
Content-Type: text/plain; charset=utf-8\x0d
Content-Length: 12\x0d
Date: Mon, 02 May 2022 23:32:34 GMT\x0d
Connection: close\x0d
\x0d
Hello World!
```

**Be aware:** The exact output format is likely to change over time as more protocols are supported.

## More

A lot more documentation and examples by many different authors can be found in the
[mojo.js wiki](https://github.com/mojolicious/mojo.js/wiki).

## Support

If you have any questions the documentation might not yet answer, don't hesitate to ask in the
[Forum](https://github.com/mojolicious/mojo.js/discussions), or on [IRC](https://web.libera.chat/#mojo).
