
# Cheatsheet

A quick overview of the most important [mojo.js](https://mojojs.org) classes, helpers and hooks.

## Classes

### App

The [mojo.js](https://mojojs.org) application object. Created with the `mojo` function, which accepts a few options,
but none of them are required.

```js
import mojo from '@mojojs/core';

const app = mojo({

  // Default configuration
  config: {name: 'My Application'},

  // Detect if the application has been imported and disable the command line interface if it has
  detectImport: true,

  // Format for HTTP exceptions ("html", "json", or "txt")
  exceptionFormat: 'html',

  // Rotating secret passphrases used for signed cookies and the like
  secrets: ['s3cret'],

  // Operating mode for application
  mode: 'development'
});
```

It is usually called `app`.

```js
// config: plain configuration object, filled with data by config plugins, use it to to store arbitrary information
app.config.foo = 'bar';
const foo = app.config.foo;

// exceptionFormat: format for HTTP exceptions ("html", "json", or "txt")
app.exceptionFormat = 'html';

// secrets: rotating secret passphrases used for signed cookies and the like
app.secrets = ['s3cret pa$$phrase'];

// mode: operating mode for application
const mode = app.mode;

// home: a `Path` object with the path of the application home directory
const path = app.home.child('config.json').toString();
const content = app.home.child('views', 'foo.html.tmpl').readFile('utf8');

// models: plain object, use it to store arbitray models
app.models.frameworks = [{name: 'Catalyst'}, {name: 'Mojolicious'}, {name: 'mojo.js'}];

// log: the application logger
const child = app.log.child({someContextValue: 123, anotherContextValue: 'test'});
child.debug('Shut up and take my money!');

// validator: general purpose JSON schema validator
app.validator.addSchema({type: 'object'}, 'testForm');
const validate = app.validator.schema('testForm');

// ua: a `UserAgent` object for use inside the application
const res = await app.ua.get('https://mojolicious.org');
const dom = await res.html();
const title = dom.at('title').text();

// session: the encrypted cookie based session manager
app.session.cookieName = 'myapp';
app.session.sameSite = 'strict';

// mime: manage MIME types
app.mime.custom['foo'] = 'text/foo; charset=utf-8';

// renderer: the application renderer, use it to add template engines and view directories
app.renderer.addEngine('foo', fooEngine);
app.renderer.viewPaths.push(app.home.child('templates').toString());

// cli: the command line interface, use it to add your own custom commands
app.cli.commandPaths.push(app.home.child('cli').toString());

// newMockContext: create a new mock context for application (very useful for testing)
const ctx = app.newMockContext();
const html = ctx.faviconTag();

// newTestUserAgent: create a new test user-agent for application
const ua = await app.newTestUserAgent();
(await ua.getOk('/')).statusIs(200).bodyIs('Hello World!');

// addAppHook: add an application hook to extend the framework
app.addAppHook('server:start', async app => {
  app.config.deployment = 'server';
});

// addContextHook: add a context hook to extend the framework
app.addContextHook('dispatch:before', async ctx => {
  ctx.res.set('Server', 'MyServer 1.0');
});

// addHelper: add a helper
app.addHelper('debug', (ctx, str) => {
  ctx.app.log.debug(str);
});
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

// log: log messages with request id as context
ctx.log.debug('Shut up and take my money!');

// urlFor: generate URL for route or path
const url = ctx.urlFor('index');

// urlForFile: generate URL for static file
const url = ctx.urlForFile('foo/app.css');

// urlForAsset: generate URL for asset
const url = ctx.urlForAsset('app.js');

// urlWith: generate URL for route or path and preserve the current query parameters
const url = ctx.urlWith('index');

// session: persistent data storage for the next few requests.
const session = await ctx.session();
session.user = 'kraih';
const user = session.user;

// flash: data storage persistent only for the next request.
const flash = await ctx.flash();
flash.confirmation = 'The record has been updated';

// config: access application config
const foo = ctx.config.foo;

// models: access application models
const users = ctx.models.users;

// schema: access validation function for JSON schema
const validate = ctx.schema({$id: 'testForm', type: 'object'});
const result = validate(await ctx.req.json());
const valid = result.isValid;

// redirectTo: send `302` redirect response
await ctx.redirectTo('index');
await ctx.redirectTo('https://mojojs.org');

// respondTo: automatically select best possible representation for resource
await ctx.respondTo({
  json: {json: {hello: 'world'}},
  any: {text: 'Hello World!'}
});

// sendFile: send static file
await ctx.sendFile(ctx.home.child('index.js'));

// proxyRequest: perform HTTP request and forward the response as efficient as possible
await ctx.proxyRequest({method: 'GET', url: 'http://mojolicious.org', headers: {Accept: 'application/json'}});

// exceptionFormat: format for HTTP exceptions ("html", "json", or "txt")
ctx.exceptionFormat = 'html';

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

// Create a response by rendering an inline view (tmpl by default)
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
const foo = params.get('foo');

// Retrieve request body as parsed JSON
const data = await ctx.req.json();

// Retrieve request body as parsed YAML
const data = await ctx.req.yaml();

// Retrieve request body as parsed XML via `@mojojs/dom`
const dom = await ctx.req.xml();
const title = dom.at('foo > title').text();

// Retrieve request body as parsed HTML via `@mojojs/dom`
const dom = await ctx.req.html();
const title = dom.at('head > title').text();

// Retrieve request body as a `Readable` stream
const stream = ctx.req.createReadStream();

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
// status: set response code and message
ctx.res.status(200);
ctx.res.status(289, 'Custom Status');

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

## Helpers

These generic utility helpers are currently available by default:

#### currentRoute

```js
const name = ctx.currentRoute();
```

Get the current route name.

#### inspect

```js
const serialized = ctx.inspect({hello: 'world'});
```

Serialize data structure for debugging.

#### proxyGet

```js
await ctx.proxyGet('http://mojolicious.org', {headers: {Accept: 'application/json'}});
```

Perform `GET` request and forward response as efficiently as possible.

#### proxyPost

```js
await ctx.proxyPost('http://mojolicious.org', {headers: {Accept: 'application/json'}});
```

Perform `POST` request and forward response as efficiently as possible.

#### proxyRequest

```js
await ctx.proxyRequest({method: 'PATCH', url: 'http://mojolicious.org'});
```

Perform a custom HTTP request and forward response as efficiently as possible.

```js
// Forward with exception handling
ctx.proxyRequest({method: 'GET', url: 'http://mojolicious.org'}).catch(async error => {
  ctx.log.debug(`Proxy error: ${error}`);
  await ctx.render({text: 'Something went wrong!', status: 400});
});

// Forward with custom request and response headers
const headers = ctx.req.headers.clone().dehop().set('X-Proxy', 'Mojo').toObject();
await ctx.proxyRequest({method: 'GET', url: 'http://example.com', headers});
ctx.res.set('X-Proxy', 'Mojo');
```

## Exception Helpers

These exception helpers are currently available by default, they can be overloaded to change framework behavior:

#### exception

```js
await ctx.exception(new Error('Something went wrong!'));
```

Render an exception response in the appropriate format by delegating to more specific exception helpers for HTTP and
WebSockets.

#### htmlException

```js
await ctx.htmlException(new Error('Something went wrong!'));
```

Render an HTML response and set the response status to `500`.

#### htmlNotFound

```js
await ctx.htmlNotFound();
```

Render an HTML response and set the response status to `404`.

#### httpException

```js
await ctx.httpException(new Error('Something went wrong!'));
```

Log the exception and render an HTTP exception response in the appropriate format and set the response status to `500`
by delegating to more specific exception helpers for HTML, JSON and plain text rendering.

#### jsonException

```js
await ctx.jsonException(new Error('Something went wrong!'));
```

Render a JSON response and set the response status to `500`.

#### jsonNotFound

```js
await ctx.jsonNotFound();
```

Render a JSON response and set the response status to `404`.

#### notFound

```js
await ctx.notFound();
```

Render a not found response in the appropriate format by delegating to more specific exception helpers for HTTP and
WebSockets.

#### txtException

```js
await ctx.txtException(new Error('Something went wrong!'));
```

Render a plain text response and set the response status to `500`.

#### txtNotFound

```js
await ctx.txtNotFound();
```

Render a plain text response and set the response status to `404`.

#### websocketException

```js
await ctx.websocketException(new Error('Something went wrong!'));
```

Log the exception and close the WebSocket connection with an `1011` error code.

## View Helpers

View helpers available in templates as `tags.*` are also available as `ctx.tags.*` everywhere else in the application.
These view helpers are currently available by default, all of them return promises:

#### asset

```
%= await tags.asset('app.js')
%= await tags.asset('app.js', {async: 'async'})
```

Generate `<script>`, `<link>` or `<img>` tag for static asset.

#### buttonTo

```
%= await tags.buttonTo('some_route', {class: 'foo'}, 'Go there');
%= await tags.buttonTo(['some_route', {values: {placeholder: 'foo'}}], {class: 'foo'}, 'Go there');
```

Generate portable `<form>` tag with `ctx.formFor()`, containing a single button.

#### checkBox

```
%= await tags.checkBox('test')
%= await tags.checkBox('test', {class: 'user', value: 'passed'})
```

Generate `<input>` tag of type `checkbox`. Previous input values will automatically get picked up and shown as default.

#### colorField

```
%= await tags.colorField('background')
%= await tags.colorField('background', {class: 'foo'})
```

Generate `<input>` tag of type `color`. Previous input values will automatically get picked up and shown as default.

#### dateField

```
%= await tags.dateField('end')
%= await tags.dateField('end', {class: 'foo'})
```

Generate `<input>` tag of type `date`. Previous input values will automatically get picked up and shown as default.

#### datetimeField

```
%= await tags.datetimeField('end')
%= await tags.datetimeField('end', {class: 'foo'})
```

Generate `<input>` tag of type `datetime`. Previous input values will automatically get picked up and shown as default.

#### emailField

```
%= await tags.emailField('notify')
%= await tags.emailField('notify', {class: 'foo'})
```

Generate `<input>` tag of type `email`. Previous input values will automatically get picked up and shown as default.

#### favicon

```
%= await tags.favicon()
%= await tags.favicon('favicon.ico')
```

Generate `<link>` tag for a favison, defaults to the [mojo.js](https://mojojs.org) favicon.

#### fileField

```
%= await tags.fileField('pass')
%= await tags.fileField('pass', {class: 'password'})
```

Generate `<input>` tag of type `file`.

#### formFor

```
%= await tags.formFor('some_route', {class: 'foo'}, 'Form content')
%= await tags.formFor(['some_route', {values: {placeholder: 'foo'}}], {class: 'foo'}, 'Form content')
```

Generate portable `<form>` tag with `ctx.urlFor()`. For routes that do not allow `GET`, a `method` attribute with the
value `POST` will be automatically added. And for methods other than `GET` or `POST`, an `_method` query parameter will
be added as well.

#### hiddenField

```
%= await tags.hiddenField('foo', 'bar')
%= await tags.hiddenField('foo', 'bar', {class: 'yada'})
```

Generate `<input>` tag of type `hidden`.

#### image

```
%= await tags.image('myapp/logo.png')
%= await tags.image('myapp/logo.png', {alt: 'just a logo'})
```

Generate `<img>` tag for image file.

#### include

```
%= await ctx.include('_navbar')
```

Include a partial template.

#### input

```
%= await tags.input('first_name')
%= await tags.input('employed', {type: 'checkbox'})
```

Generate `<input>` tag. Previous input values will automatically get picked up and shown as default.

#### labelFor

```
%= await tags.labelFor('first_name', {class: 'foo'}, 'First name')
```

Generate `<label>` tag.

#### linkTo

```
%= await tags.linkTo('some_route', {class: 'foo'}, 'Link to some route');
%= await tags.linkTo(['some_route', {values: {placeholder: 'foo'}}], {class: 'foo'}, 'Link to some route');
```

Generate portable `a` tag with `ctx.urlFor()`.

#### monthField

```
%= await tags.monthField('vacation')
%= await tags.monthField('vacation', {class: 'foo'})
```

Generate `<input>` tag of type `month`. Previous input values will automatically get picked up and shown as default.

#### numberField

```
%= await tags.numberField('age')
%= await tags.numberField('age', {class: 'foo'})
```

Generate `<input>` tag of type `number`. Previous input values will automatically get picked up and shown as default.

#### passwordField

```
%= await tags.passwordField('pass')
%= await tags.passwordField('pass', {class: 'password'})
```

Generate `<input>` tag of type `password`.

#### radioButton

```
%= await tags.radioButton('test')
%= await tags.radioButton('test', {class: 'user', value: 'passed'})
```

Generate `<input>` tag of type `radio`. Previous input values will automatically get picked up and shown as default.

#### rangeField

```
%= await tags.rangeField('age')
%= await tags.rangeField('age', {class: 'foo', min: 0, max: 200})
```

Generate `<input>` tag of type `range`. Previous input values will automatically get picked up and shown as default.

#### script

```
%= await tags.script('bootstrap/bootstrap.bundle.min.js')
%= await tags.script('bootstrap/bootstrap.bundle.min.js', {async: 'async'})
```

Generate `<script>` tag for JavaScript file.

#### searchField

```
%= await tags.searchField('first_name')
%= await tags.searchField('first_name', {class: 'user'})
```

Generate `<input>` tag of type `search`. Previous input values will automatically get picked up and shown as default.

#### style

```
%= await tags.style('bootstrap/bootstrap.min.css')
%= await tags.style('bootstrap/bootstrap.min.css', {media: 'foo'})
```

Generate `<link>` tag for CSS file.

#### submitButton

```
%= await tags.submitButton()
%= await tags.submitButton('Search')
%= await tags.submitButton('Search', {class: 'foo'})
```

Generate `input` tag of type `submit`.

#### tag

```
%= await ctx.tag('div')
%= await ctx.tag('div', {class: 'wrapper'})
%= await ctx.tag('div', {class: 'wrapper'}, 'Hello World!')
%= await ctx.tag('div', {class: 'wrapper'}, Promise.resolve('Hello World!'))
%= await ctx.tag('div', {class: 'wrapper'}, async () => 'Hello World!')
```

Generate HTML tag.

#### telField

```
%= await tags.telField('work')
%= await tags.telField('work', {class: 'foo'})
```

Generate `<input>` tag of type `tel`. Previous input values will automatically get picked up and shown as default.

#### textArea

```
%= await tags.textArea('story')
%= await tags.textArea('story', {cold: '40'})
%= await tags.textArea('story', {cold: '40'}, 'Default value')
```

Generate `<textarea>` tag. Previous input values will automatically get picked up and shown as default.

#### textField

```
%= await tags.textField('first_name')
%= await tags.textField('first_name', {class: 'user'})
```

Generate `<input>` tag of type `text`. Previous input values will automatically get picked up and shown as default.

#### timeField

```
%= await tags.timeField('meeting')
%= await tags.timeField('meeting', {class: 'foo'})
```

Generate `<input>` tag of type `time`. Previous input values will automatically get picked up and shown as default.

#### urlField

```
%= await tags.urkField('address')
%= await tags.urlField('address', {class: 'foo'})
```

Generate `<input>` tag of type `url`. Previous input values will automatically get picked up and shown as default.

#### weekField

```
%= await tags.weekField('vacation')
%= await tags.weekField('vacation', {class: 'foo'})
```

Generate `<input>` tag of type `week`. Previous input values will automatically get picked up and shown as default.

## Hooks

These are all application hooks that are currently available, in the same order they usually run:

### command:before

Runs after `app.start()` has been called, and before the application loads all available commands.

```js
app.addAppHook('command:before', async (app, args) => {
  if (args[2] === 'legacy-server') args[2] = 'server';
});
```

Useful for reconfiguring the application before running a command. Passed the application object and command arguments.
Can return `true` to intercept the command line interface.

### command:init

Runs after the application has loaded all commands and right before it reaches a specific command or prints the
command list.

```js
app.addAppHook('command:init', async (app, args) => {
  app.cli.commands['legacy-server'] = app.cli.commands.server;
});
```

Useful for reconfiguring the application before running a command or to modify the behavior of a command. Passed the
application object and command arguments. Can return `true` to intercept the command line interface.

### server:start

Runs whenever a server has been started.

```js
app.addAppHook('server:start', async app => {
  app.config.deployment = 'server';
});
```

Useful for reconfiguring the application or warming up caches that depend on a server environment. Passed the
application object.

### app:start

This hook combines [command:before](#command:before) and [server:start](#server:start). It is usually a good first
choice for running code during application startup.

```js
app.addAppHook('app:start', async app => {
  await app.models.foo.prepareConnections();
});
```

Useful for reconfiguring the application, warming up caches or preparing database connections. Passed the application
object.

```js
app.onStart(async app => {
  await app.models.foo.prepareConnections();
});
```

Since this is one of the most commonly used hooks, there is also an `app.onStart()` shortcut method available.

### app:warmup

Runs whenever the application warms up caches, usually that is less often than `app:start`.

```js
app.addAppHook('app:warmup', async app => {
  await app.models.bar.warmup();
});
```

Useful for warming up caches and application embedding. Passed the application object.

### server:stop

Runs whenever a server has been stopped.

```js
app.addAppHook('server:stop', async app => {
  await app.models.foo.someCleanupCode();
});
```

Useful for cleanup tasks that depend on a server environment. Passed the application object.

### command:after

Runs after a command is finished or the command list has been printed.

```js
app.addAppHook('command:after', async (app, args) => {
  if (args[2] === 'server') await app.models.foo.someCleanupCode();
});
```

Useful for cleanup tasks that depend on a command line environment. Passed the application object and command argument.

### app:stop

This hook combines [command:after](#command:after) and [server:stop](#server:stop). It is usually a good first choice
for running code during application shutdown.

```js
app.addAppHook('app:stop', async app => {
  await app.models.foo.releaseConnections();
});
```

Useful for cleanup tasks like releasing idle database connections. Passed the application object.

```js
app.onStop(async app => {
  wait app.models.foo.releaseConnections();
});
```

Since this is one of the most commonly used hooks, there is also an `app.onStop()` shortcut method available.

## Context Hooks

These are all context hooks that are currently available, in the same order they usually run:

### dispatch:before

Runs after a new request has been received and before the static file server and router start their work.

```js
app.addContextHook('dispatch:before', async ctx => {
  const agent = ctx.req.get('user-agent') ?? '';
  if (/Internet Explorer/.test(agent) === true) ctx.stash.browser = 'ie';
});
```

Useful for rewriting incoming requests and other preprocessing tasks. Passed the context object. Can return `true` to
intercept the static file server and router.

### static:before

Runs before the static file server sends a response.

```js
app.addContextHook('static:before', async (ctx, file) => {
  ctx.res.set('Cache-Control', 'max-age=3600, must-revalidate');
});
```

Mostly used for post-processing static file responses. Passed the context object and the static file to be sent. Can
return `true` to intercept sending the static file.

### router:before

Runs after the static file server determined if a static file should be served and before the router starts its work.

```js
app.addContextHook('router:before', async ctx => {
  if (ctx.req.path !== '/test') return;
  await ctx.render({text: 'Intercepted!'});
  return true;
});
```

Mostly used for custom dispatchers and collecting metrics. Passed the context object. Can return `true` to intercept
the router.

### render:before

Runs before content is generated by the renderer. Note that this hook can trigger out of order due to its dynamic
nature, and with embedded applications will only work for the application that is rendering.

```js
app.addContextHook('render:before', async (ctx, options) => {
    if (options.custom !== undefined) options.engine = 'customEngine';
});
```

Mostly used for pre-processing options passed to the renderer. Passed the context object and render options.

### send:before

Runs after `ctx.res.send()` has been called and before dynamically generated content is sent with the response.

```js
app.addContextHook('send:before', async (ctx, body) => {
  ctx.res.set('Cache-Control', 'max-age=3600, must-revalidate');
});
```

Useful for post-processing dynamically generated content. Passed the context object and the dynamically generated
content. Can return an arbitrary value to replace the dynamic content.

## More

A lot more documentation and examples by many different authors can be found in the
[mojo.js wiki](https://github.com/mojolicious/mojo.js/wiki).

## Support

If you have any questions the documentation might not yet answer, don't hesitate to ask in the
[Forum](https://github.com/mojolicious/mojo.js/discussions), or on [IRC](https://web.libera.chat/#mojo).
