
# The mojo.js HTTP and WebSocket Client

The [mojo.js](https://mojojs.org) toolkit contains a full featured HTTP and WebSocket user agent. And while its primary
purpose is integration testing of web applications, it can also be used for many other things.

```js
import {Client} from '@mojojs/core';

const client = new Client();
const res = await client.get('https://mojolicious.org');
const content = await res.text();
```

The API is heavily inspired by the [Fetch Standard](https://fetch.spec.whatwg.org) and should feel familar if you've
used `fetch` before.

## Client Options

The client can be initialized with a few options, but none of them are required.

```js
const client = new Client({

  // Base URL to be used to resolve all relative request URLs with
  baseURL: 'http://127.0.0.1:3000',

  // Cookie jar to use, defaults to `tough-cookie`
  cookieJar: new tough.CookieJar(),

  // Maximum number of redirects to follow, default to none
  maxRedirects: 5,

  // Name of user agent to send with `User-Agent` header
  name: 'mojoUA/1.0'
});
```

By default a [tough-cookie](https://www.npmjs.com/package/tough-cookie) cookie jar will be used, and you can reconfigure
it however you like.

```js
client.cookieJar.allowSpecialUseDomain = true;
```

## Request Config

Every request is represented by a config object that contains various properties to describe every part of the HTTP
request.

```js
const res = await client.request({

  // HTTP method for request
  method: 'GET',

  // URL of request target as a string or URL object, may be be relative to `client.baseURL`
  url: new URL('https://mojolicious.org'),

  // Headers to include in request
  headers: {Accept: '*/*', Authorization: 'token 123456789abcdef'},

  // Object with key/value pairs to be sent with the query string
  query: {fieldA: 'first value', fieldB: 'second value'},

  // Request body as a string, `Buffer` or `stream.Readable` object
  body: 'Some content to send with request',

  // Data structure to be send in JSON format, or for WebSockets a `true` value to enable JSON mode
  json: {hello: ['world']},

  // Object with key/value pairs to be sent in `application/x-www-form-urlencoded` format
  form: {fieldA: 'first value', fieldB: 'second value'},

  // Object with key/value pairs to be sent in `multipart/form-data` format
  formData: {fieldA: 'first value', fieldB: 'second value'},

  // Disable TLS certificate validation
  insecure: true,

  // Basic authentication
  auth: 'user:password',

  // Alternative `http.Agent` object to use, for keep-alive or SOCKS proxy support with `proxy-agent`
  agent: new http.Agent({keepAlive: true})
});
```

The `request` method returns a `Promise` that resolves with a response object, right after the response
status line and headers have been received. But before any data from the response body has been read, which can be
handled in a separate step later on.

## Request Shortcuts

Since every request includes at least `method` and `url` values, there are HTTP method specific shortcuts you can use
instead of `request`.

```js
const res = await client.delete('https://mojolicious.org');
const res = await client.get('https://mojolicious.org');
const res = await client.head('https://mojolicious.org');
const res = await client.options('https://mojolicious.org');
const res = await client.patch('https://mojolicious.org');
const res = await client.post('https://mojolicious.org');
const res = await client.put('https://mojolicious.org');
```

All remaining config values can be passed with a second argument to any one of the shortcut methods.

```js
const res = await client.post('/search', {form: {q: 'mojo'}});
```

## Response Headers

Status line information and response headers are available right away with the response object.

```js
// Status code and message
const statusCode = res.status;
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

The original [http.IncomingMessage](https://nodejs.org/api/http.html#http_class_http_incomingmessage) object is also
available under the name `raw`.

```js
// HTTP protocol version
const version = res.raw.httpVersion;
```

## Response Body

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

// Parsed HTML via `cheerio`
const document = await res.html();
const title = document('title').text();

// Parsed XML via `cheerio`
const document = await res.xml();

// Async iterator
const parts = [];
for await (const chunk of res) {
  parts.push(chunk);
}
const buffer = Buffer.concat(parts);
```

For HTML and XML parsing [cheerio](https://www.npmjs.com/package/cheerio) will be used. Making it very easy to extract
information from documents with just a CSS selector and almost no code at all.

## WebSockets

For WebSocket handshakes there are also quite a few options available.

```js
const ws = await client.websocket('wss://mojolicious.org', {

  // Headers to include in handshake
  headers: {Accept: '*/*', Authorization: 'token 123456789abcdef'},

  // Object with key/value pairs to be sent with the query string
  query: {fieldA: 'first value', fieldB: 'second value'},

  // Enable JSON mode (encoding and decoding all messages automatically)
  json: true,

  // Basic authentication
  auth: 'user:password',

  // WebSocket subprotocols
  protocols: ['foo', 'bar']
});
```

You can choose between multiple API styles.

```js
// Events
const ws = await client.websocket('/ws');
ws.send('something');
ws.on('message', message => {
  console.log(message);
});

// Async iterator
const ws = await client.websocket('/ws');
ws.send('something');
for await (const message of ws) {
  console.log(message);
}
```

With support for `ping` and `pong` frames.

```js
// Handshake with authentication headers
const ws = await client.websocket('/ws', {headers: {Authorization: 'token 123456789abcdef'}});
ws.on('ping', data => {
  ws.pong(data);
});
```

Cookies from the cookie jar will of course also be available for the handshake, so you can rely on them for things like
authentication.

## Testing

For web application testing there is also a more specialised subclass available that adds various test methods using
[assert](https://nodejs.org/api/assert.html) to integrate seamlessly into most testing frameworks.

```js
const client = TestClient({baseURL: 'https://mojolicious.org'});
(await client.getOk('/')).statusIs(200).headerLike('Content-Type', /html/).bodyLike(/Mojolicious/);
```

[tap](https://www.npmjs.com/package/tap) subtests are also supported, and scope changes can be managed automatically
with the `tap` option.

```js
import {TestClient} from '@mojojs/core';
import t from 'tap';

t.test('Mojolicious', async t => {
  const client = new TestClient({baseURL: 'https://mojolicious.org', tap: t});

  await t.test('Index', async t => {
    (await client.getOk('/')).statusIs(200).bodyLike(/Mojolicious/);
  });
});
```

And to test mojo.js web applications there is no need to mock anything. The test client can automatically start and
manage a web server listening to a random port for you.

```js
import {app} from '../index.js';
import t from 'tap';

t.test('Example application', async t => {
  const client = await app.newTestClient({tap: t});

  await t.test('Index', async t => {
    (await client.getOk('/')).statusIs(200).bodyLike(/mojo.js/);
  });

  await client.stop();
});
```

There are test alternatives for all HTTP method shortcuts.

```js
await client.deleteOk('/foo');
await client.getOk('/foo', {headers: {Host: 'mojolicious.org'}});
await client.headOk('/foo', {headers: {Accept: '*/*'}});
await client.optionsOk('/foo', {auth: 'kraih:s3cret'});
await client.patchOk('/foo', {formData: {role: 'admin'}});
await client.postOk('/foo', {body: Buffer.from('Hello Mojo!')});
await client.putOk('/foo', {json: {hello: 'world'}});

await client.websocketOk('/ws', {protocols: ['test/1', 'test/2']});
```

All test methods return the client object again to allow for easy method chaining and all state is stored inside the
client object.

```js
// Status tests
(await client.getOk('/foo'))
  .statusIs(200);

// Header tests
(await client.getOk('/foo'))
  .typeIs('text/html')
  .typeLike(/html/)
  .headerIs('Content-Type', 'text/html')
  .headerLike('Content-Type', /html/)
  .headerExists('Content-Type')
  .headerExistsNot('X-Test');

// Body tests
(await client.getOk('/foo'))
  .bodyIs('Hello World!')
  .bodyLike(/Hello/)
  .bodyUnlike(/Bye/);

// JSON tests
(await client.getOk('/foo'))
  .jsonIs({hello: 'world'});

// HTML tests
(await client.getOk('/foo'))
  .elementExists('head > title')
  .elementExistsNot('body #error');
```

Testing WebSockets is almost as easy, but all operations are async and  have to return a `Promise`.

```js
await client.websocketOk('/echo');
await client.sendOk('hello');
assert.equal(await client.messageOk(), 'echo: hello');
await client.closeOk(4000);
await client.closedOk(4000);
```

And while the test client is very efficient for testing backend services, for frontend testing we recommend combining it
with [playwright](https://www.npmjs.com/package/playwright).

## Support

If you have any questions the documentation might not yet answer, don't hesitate to ask in the
[Forum](https://github.com/mojolicious/mojo.js/discussions) or the official IRC channel `#mojo.js` on `irc.libera.chat`
([chat now](https://web.libera.chat/#mojo.js)!).
