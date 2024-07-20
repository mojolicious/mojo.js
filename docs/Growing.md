
# Growing

This document explains the process of starting a single file prototype from scratch and growing it into a
well-structured [mojo.js](https://mojojs.org) application.

## Concepts

Essentials every [mojo.js](https://mojojs.org) developer should know.

### Model View Controller

MVC is a software architectural pattern for graphical user interface programming originating in Smalltalk-80, that
separates application logic, presentation and input.

```
         +------------+    +-------+    +------+
Input -> | Controller | -> | Model | -> | View | -> Output
         +------------+    +-------+    +------+
```

A slightly modified version of the pattern moving some application logic into the controller is the foundation of
pretty much every web framework these days, including [mojo.js](https://mojojs.org).

```
            +----------------+     +-------+
Request  -> |                | <-> | Model |
            |                |     +-------+
            |   Controller   |
            |                |     +-------+
Response <- |                | <-> | View  |
            +----------------+     +-------+
```

The controller receives a request from a user, passes incoming data to the model and retrieves data from it, which then
gets turned into an actual response by the view. But note that this pattern is just a guideline that most of the time
results in cleaner more maintainable code, not a rule that should be followed at all costs.

### REpresentational State Transfer

REST is a software architectural style for distributed hypermedia systems such as the web. While it can be applied to
many protocols it is most commonly used with HTTP these days. In REST terms, when you are opening a URL like
`http://mojojs.org/foo` with your browser, you are basically asking the web server for the HTML representation of the
`http://mojojs.org/foo` resource.

```
+--------+                                 +--------+
|        | -> http://mojojs.org/foo     -> |        |
| Client |                                 | Server |
|        | <-  <html>Mojo rocks!</html> <- |        |
+--------+                                 +--------+
```

The fundamental idea here is that all resources are uniquely addressable with URLs and every resource can have
different representations such as HTML, RSS or JSON. User interface concerns are separated from data storage concerns
and all session state is kept client-side.

```
+---------+                        +------------+
|         | ->    PUT /foo      -> |            |
|         | ->    Hello World!  -> |            |
|         |                        |            |
|         | <-    201 CREATED   <- |            |
|         |                        |            |
|         | ->    GET /foo      -> |            |
| Browser |                        | Web Server |
|         | <-    200 OK        <- |            |
|         | <-    Hello World!  <- |            |
|         |                        |            |
|         | ->    DELETE /foo   -> |            |
|         |                        |            |
|         | <-    200 OK        <- |            |
+---------+                        +------------+
```

While HTTP methods such as `PUT`, `GET` and `DELETE` are not directly part of REST they go well with it and are
commonly used to manipulate resources.

### Sessions

HTTP was designed as a stateless protocol, web servers don't know anything about previous requests, which makes
user-friendly login systems tricky. Sessions solve this problem by allowing web applications to keep stateful
information across several HTTP requests.

```
GET /login?user=sebastian&pass=s3cret HTTP/1.1
Host: mojojs.org

HTTP/1.1 200 OK
Set-Cookie: sessionid=987654321
Content-Length: 10
Hello sebastian.

GET /protected HTTP/1.1
Host: mojojs.org
Cookie: sessionid=987654321

HTTP/1.1 200 OK
Set-Cookie: sessionid=987654321
Content-Length: 16
Hello again sebastian.
```

Traditionally all session data was stored on the server-side and only session IDs were exchanged between browser and
web server in the form of cookies.

```
Set-Cookie: session=aes-256-gcm(json({user: 'sebastian'}))
```

In [mojo.js](https://mojojs.org) however we are taking this concept one step further by storing everything JSON
serialized in AES-256-GCM encrypted cookies, which is more compatible with the REST philosophy and reduces
infrastructure requirements.

### Test-Driven Development

TDD is a software development process where the developer starts writing failing test cases that define the desired
functionality and then moves on to producing code that passes these tests. There are many advantages such as always
having good test coverage and code being designed for testability, which will in turn often prevent future changes from
breaking old code. Much of [mojo.js](https://mojojs.org) was developed using TDD.

## Prototype

An important difference between [mojo.js](https://mojojs.org) and other web frameworks is that it can operate in two
modes, both as a full-fledged web framework, and as a single file micro web framework optimized for rapid prototyping.

### Differences

You likely know the feeling, you've got a really cool idea and want to try it as quickly as possible. That's exactly
why [mojo.js](https://mojojs.org) applications don't need more than a single JavaScript file (in addition to
`package.json`).

```
myapp                          // Application directory (created manually)
|-- node_modules/
|   `-- *lots of node files*
|-- package.json               // Will be generated when you install mojo.js
`-- myapp.js                   // Templates can be inlined in the file
```

Full [mojo.js](https://mojojs.org) applications on the other hand follow the MVC pattern more closely and separate
concerns into different files to maximize maintainability:

```
myapp                               // Application directory (created manually)
|-- node_modules
|   `-- *lots of node files*
|-- package.json                    // Node package information and settings
|-- test                            // Test directory
|   `-- example.js                  // Random test
|-- config.yml                      // Configuration file
|-- public                          // Static file directory (served automatically)
|   |-- assets                      // Static assets created by bundlers
|   |   `-- *generated assets*
|   `-- index.html                  // Static HTML file
|-- index.js                        // Application script
|-- controllers                     // Controller directory
|   `-- example.js                  // Controller class
|-- models                          // Model directory
`-- views                           // Views directory
    |-- example                     // View directory for "example" controller
    |    `-- welcome.html.tmpl      // Template for "welcome" action
    `-- layouts                     // View directory for layout templates
        `-- default.html.tmpl       // Layout template
```

Both application skeletons can be automatically generated with the commands `npm create @mojojs/lite-app` and
`npm create @mojojs/full-app`.

```
$ mkdir myapp && cd myapp
$ npm create @mojojs/full-app   # or
$ npm create @mojojs/lite-app
$ npm install
```

Feature-wise both are almost equal, the only real differences are organizational, so each one can be gradually
transformed into the other.

### TypeScript

[TypeScript](https://www.typescriptlang.org) is fully supported as well, and in fact mojo.js itself is written entirely
in TypeScript. But because it requires a build step, we recommend a slightly different directory layout for
applications that are planning to use it. With a `src` directory for `.ts` source files, and a `lib` directory for the
compiled `.js` output files.

```
myapp                               // Application directory (created manually)
|-- node_modules
|   `-- *lots of node files*
|-- package.json                    // Node package information and settings
|-- tsconfig.json                   // TypeScript configuration
|-- test                            // Test directory
|   `-- example.js                  // Random test
|-- config.yml                      // Configuration file
|-- public                          // Static file directory (served automatically)
|   |-- assets                      // Static assets created by bundlers
|   |   `-- *generated assets*
|   `-- index.html                  // Static HTML file
|-- src                             // TypeScript source directory
|   |-- index.ts                    // Application script
|   |-- controllers                 // Controller directory
|   |   `-- example.ts              // Controller class
|   `-- models                      // Model directory
|-- lib
|   `-- *compiled js files*
`-- views                           // Views directory
    |-- example                     // View directory for "example" controller
    |    `-- welcome.html.tmpl      // Template for "welcome" action
    `-- layouts                     // View directory for layout templates
        `-- default.html.tmpl       // Layout template
```

A fully functional TypeScript mojo.js application can be generated with the command
`npm create @mojojs/full-app -- --ts`.

```
$ mkdir myapp && cd myapp
$ npm create @mojojs/full-app -- --ts
$ npm install
$ npm run build:test
```

However, the use of TypeScript is completely optional, and for the rest if this guide we will stick with plain old
JavaScript.

## Foundation

We start our new application with a single JavaScript file.

```
$ mkdir myapp
$ cd myapp
$ npm install @mojojs/core
$ touch myapp.js
```

This will be the foundation for our login manager example application. 

```js
import mojo from '@mojojs/core';

const app = mojo();

app.get('/', async ctx => {
  await ctx.render({text: 'Hello World!'})
});

app.start();
```

Use the built-in `server` command to start a development web server with node.

```
$ node myapp.js server
Web application available at http://0.0.0.0:3000/
```

For a little more convenice, we recommend [nodemon](https://github.com/remy/nodemon), which can watch files for changes
and automatically restart the web server for you.

```
$ npm install nodemon
$ npx nodemon myapp.js server
```

### A Bird's-Eye View

It all starts with an HTTP request like this, sent by your browser.

```
GET / HTTP/1.1
Host: localhost:3000
```

Once the request has been received by the web server through the event loop, it will be passed on to
[mojo.js](https://mojojs.org), where it will be handled in a few simple steps.

1. Check if a static file exists that would meet the requirements.
2. Try to find a route that would meet the requirements.
3. Dispatch the request to this route, usually reaching one or more actions.
4. Process the request, maybe generating a response with the renderer.
5. Return control to the web server, and if no response has been generated yet,
   wait for a non-blocking operation to do so through the event loop.

With our application the router would have found an action in step 2, and rendered some text in step 4, resulting in an
HTTP response like this being sent back to the browser.

```
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Content-Length: 12
Date: Wed, 15 Dec 2021 22:47:21 GMT
Connection: keep-alive
Keep-Alive: timeout=5

Hello World!
```

### Model

In [mojo.js](https://mojojs.org) we consider web applications simple frontends for existing business logic. That means
[mojo.js](https://mojojs.org) is by design entirely _model_ layer agnostic, and you just use whatever JavaScript
modules you like most.

```
$ mkdir models
$ touch models/users.js
```

Our login manager will use a JavaScript class abstracting away all logic related to matching usernames and passwords.
The path `models/users.js` is an arbitrary choice, and is simply used to make the separation of concerns more visible.

```js
export default class Users {
  constructor() {
    this._data = {
      joel: 'las3rs',
      marcus: 'lulz',
      sebastian: 'secr3t'
    };
  }

  check(user, pass) {
    if(this._data[user] === undefined) return false;
    return this._data[user] === pass;
  }
}
```

We can add the model to the app to make it available to all actions and templates.

``` js
import mojo from '@mojojs/core';
import Users from './models/users.js';

export const app = mojo();

app.models.users = new Users();

app.any('/', async ctx => {

  // Query or POST parameters
  const params = await ctx.params();
  const user = params.get('user')
  const pass = params.get('pass')

  // Check password
  if(ctx.models.users.check(user, pass) === true) return await ctx.render({text: `Welcome ${user}.`});

  // Failed
  return await ctx.render({text: 'Wrong username or password.'});
});

app.start();
```

The method `params` is used to access both query parameters and `POST` parameters. It returns a `Promise` that resolves
with a [URLSearchParams](https://nodejs.org/api/url.html#url_class_urlsearchparams) object.

### Testing

In [mojo.js](https://mojojs.org) we take testing very seriously and try to make it a pleasant experience.

```
$ mkdir tests
$ touch tests/login.js
```

`TestUserAgent` is a scriptable HTTP user-agent designed specifically for testing, with many fun and state-of-the-art
features such as CSS selectors based on [@mojojs/dom](https://www.npmjs.com/package/@mojojs/dom).

```js
import {app} from '../myapp.js';
import t from 'tap';

t.test('Example application', async t => {
  const ua = await app.newTestUserAgent({tap: t, maxRedirects: 1});

  await t.test('Index', async t => {
    (await ua.getOk('/'))
      .statusIs(200)
      .elementExists('form input[name="user"]')
      .elementExists('form input[name="pass"]')
      .elementExists('button[type="submit"]');
    (await ua.postOk('/', {form: {user: 'sebastian', pass: 'secr3t'}}))
      .statusIs(200).textLike('html body', /Welcome sebastian/);

    // Test accessing a protected page
    (await ua.getOk('/protected')).statusIs(200).textLike('a', /Logout/);

    // Test if HTML login form shows up again after logout
    (await ua.getOk('/logout'))
      .statusIs(200)
      .elementExists('form input[name="user"]')
      .elementExists('form input[name="pass"]')
      .elementExists('button[type="submit"]');
  });

  await ua.stop();
});
```

Your application won't pass these tests, but from now on you can use them to check your progress.

```
$ node tests/login.t
...
```

Or perform quick requests right from the command line with the `get` command.

```
$ node myapp.pl get /
Wrong username or password.

$ node myapp.js get -v '/?user=sebastian&pass=secr3t'
[2021-12-22T19:06:06.688Z] [trace] [16173-000001] GET "/"
[2021-12-22T19:06:06.688Z] [trace] [16173-000001] Routing to function
[2021-12-22T19:06:06.689Z] [trace] [16173-000001] Rendering text response
GET /?user=sebastian&pass=secr3t HTTP/1.1
Accept-Encoding: gzip
Host: 0.0.0.0:55841

HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Content-Length: 18
Date: Wed, 22 Dec 2021 19:06:06 GMT
Connection: close

Welcome sebastian.
```

### State Keeping

Sessions in [mojo.js](https://mojojs.org) pretty much just work out-of-the-box once you await the `session` method,
there is no setup required, but we suggest setting a more secure passphrase with `app.secrets`.

```js
app.secrets = ['Mojolicious rocks'];
```

This passphrase is used by the AES-256-GCM algorithm to encrypt cookies and can be changed at any time to invalidate
all existing sessions.

```js
const session = await ctx.session();
session.user = 'sebastian';
const user = session.user;
```

By default, all sessions expire after one hour. For more control you can use the `expiration` session value to set an
expiration date in seconds from now.

```js
const session = await ctx.session();
session.expiration = 3600;
```

And the whole session can be deleted by using the `expires` session value to set an absolute expiration date in the
past.

```js
session.expires = 1;
```

For data that should only be visible on the next request, like a confirmation message after a `302` redirect performed
with `ctx.redirectTo()`, you can use the flash, accessible through `ctx.flash()`.

```js
const flash = await ctx.flash();
flash.message = 'Everything is fine.';
await ctx.redirectTo('goodbye');
```

Just remember that all session data gets serialized to JSON and stored in encrypted cookies, which usually have a `4096`
byte (4KiB) limit, depending on browser.

### Final Prototype

A final `myapp.js` prototype passing all of the tests above could look like this.

```js
import mojo from '@mojojs/core';
import Users from './models/users.js';

// Set custom cookie secret to ensure encryption is more secure
export const app = mojo({secrets: ['Mojolicious rocks']});

app.models.users = new Users();

// Main login action
app.any('/', async ctx => {

  // Query or POST parameters
  const params = await ctx.params();
  const user = params.get('user');
  const pass = params.get('pass');

  // Check password and render the index inline template if necessary
  if (ctx.models.users.check(user, pass) === false) {
    return await ctx.render({inline: indexTemplate, inlineLayout: defaultLayout});
  }

  // Store username in session
  const session = await ctx.session();
  session.user = user;

  // Store a friendly message for the next page in flash
  const flash = await ctx.flash();
  flash.message = 'Thanks for logging in.';

  // Redirect to protected page with a 302 response
  await ctx.redirectTo('protected');
}).name('index');

// Make sure user is logged in for actions in this action
const loggedIn = app.under('/').to(async ctx => {

  // Redirect to main page with a 302 response if user is not logged in
  const session = await ctx.session();
  if (session.user !== undefined) return;
  await ctx.redirectTo('index');
  return false;
});

// A protected page auto rendering the protected inline template"
loggedIn.get('/protected').to(async ctx => {
  await ctx.render({inline: protectedTemplate, inlineLayout: defaultLayout});
});

// Logout action
app.get('/logout', async ctx => {

  // Expire and in turn clear session automatically
  const session = await ctx.session();
  session.expires = 1;

  // Redirect to main page with a 302 response
  await ctx.redirectTo('index');
});

app.start();

const indexTemplate = `
% const params = await ctx.params();
<form method="post">
  % if (params.get('user') !== null) {
    <b>Wrong name or password, please try again.</b><br>
  % }
  User:<br>
  <input name="user">
  <br>Password:<br>
  <input type="password" name="pass">
  <br>
  <button type="submit">Log in</button>
</form>
`;

const protectedTemplate = `
% const flash = await ctx.flash();
% if (flash.message != null) {
  <b><%= flash.message %></b><br>
% }
% const session = await ctx.session();
Welcome <%= session.user %>.<br>
%= await tags.linkTo('logout', {}, 'Logout')
`;

const defaultLayout = `
<!DOCTYPE html>
<html>
  <head><title>Login Manager</title></head>
  <body><%== ctx.content.main %></body>
</html>
`;
```

And the directory structure should be looking like this now.

```
myapp
|-- myapp.js
|-- models
|   `-- users.js
`-- tests
    `-- login.js
```

Our templates are using quite a few features of the renderer, the [Rendering](Rendering.md) guide explains them all in
great detail.

# Well-Structured Application

Due to the flexibility of [mojo.js](https://mojojs.org), there are many variations of the actual growing process, but
this should give you a good overview of the possibilities.

### Moving Templates

While inline templates are great for prototyping, later on it is much easier to manage a growing number of templates as
separate files in the `views` directory.

```
$ mkdir -p views/layouts
$ touch views/layouts/default.html.tmpl
$ touch views/index.html.tmpl
$ touch views/protected.html.tmpl
```

Just move the content of the `indexTemplate`, `protectedTemplate` and `defaultLayout` constants into those template
files. Instead of selecting a layout in the `ctx.render()` call, from now on we will let each template select it for
themselves, so we have to add a `view.layout` statement (as first line) to each of them.

```
% view.layout = 'default';
...rest of the template...
```

### Simplified Application

Next we need to update all `ctx.render()` calls and remove the inline templates from our application.

```js
import mojo from '@mojojs/core';
import Users from './models/users.js';

export const app = mojo({secrets: ['Mojolicious rocks']});

app.models.users = new Users();

app.any('/', async ctx => {

  const params = await ctx.params();
  const user = params.get('user');
  const pass = params.get('pass');

  if (ctx.models.users.check(user, pass) === false) return await ctx.render({view: 'index'});

  const session = await ctx.session();
  session.user = user;

  const flash = await ctx.flash();
  flash.message = 'Thanks for logging in.';
  await ctx.redirectTo('protected');
}).name('index');

const loggedIn = app.under('/').to(async ctx => {
  const session = await ctx.session();
  if (session.user !== undefined) return;
  await ctx.redirectTo('index');
  return false;
});

loggedIn.get('/protected').to(async ctx => {
  await ctx.render({view: 'protected'});
});

app.get('/logout', async ctx => {
  const session = await ctx.session();
  session.expires = 1;
  await ctx.redirectTo('index');
});

app.start();
```

And the directory structure of our hybrid application should be looking like this.

```
myapp
|-- myapp.js
|-- models
|   `-- users.js
|-- tests
|   `-- login.js
`-- views
    |-- layouts
    |   `-- default.html.tmpl
    |-- index.html.tmpl
    `-- protected.html.tmpl
```

The tests will work again now.

### Controller Class

Hybrid routes with separate template files are a nice intermediate step, but to maximize maintainability it makes sense
to split our action code from its routing information.

```js
$ mkdir controllers
$ touch controlers/login.js
```

Once again the actual action code does not need to change much, we just turn them into methods and remove the arguments
from the `ctx.render()` calls (because from now on we will rely on default `controller/action` template names).

```js
export default class LoginController {

  async index(ctx) {
    const params = await ctx.params();
    const user = params.get('user');
    const pass = params.get('pass');

    if (ctx.models.users.check(user, pass) === false) return await ctx.render();

    const session = await ctx.session();
    session.user = user;

    const flash = await ctx.flash();
    flash.message = 'Thanks for logging in.';
    await ctx.redirectTo('protected');
  }

  async loggedIn(ctx) {
    const session = await ctx.session();
    if (session.user !== undefined) return;
    await ctx.redirectTo('index');
    return false;
  }

  async protected(ctx) {
    await ctx.render();
  }

  async logout(ctx) {
    const session = await ctx.session();
    session.expires = 1;
    await ctx.redirectTo('index');
  }
}
```

All [mojo.js](https://mojojs.org) controllers are just ES6 classes and get instantiated on demand by the router.

## Final Application

The application script `myapp.js` can now be reduced to model and routing information.

```js
import mojo from '@mojojs/core';
import Users from './models/users.js';

export const app = mojo({secrets: ['Mojolicious rocks']});

app.models.users = new Users();

app.any('/').to('login#index').name('index');
app.get('/logout').to('login#logout');

const loggedIn = app.under('/').to('login#loggedIn');
loggedIn.get('/protected').to('login#protected');

app.start();
```

The router allows many different route variations, the [Routing](Routing.md) guide explains them all in great detail.

### Templates

Templates are our views, and usually bound to controllers, so they need to be moved into the appropriate directories.

```
$ mkdir views/login
$ mv views/index.html.tmpl views/login/index.html.tmpl
$ mv views/protected.html.tmpl views/login/protected.html.tmpl
```

Now the tests will work again and our final directory structure should be looking like this.

```
myapp
|-- myapp.js
|-- controllers
|   `-- login.js
|-- models
|   `-- users.js
|-- tests
|   `-- login.js
`-- views
    |-- layouts
    |   `-- default.html.tmpl
    `-- login
        |-- index.html.tmpl
        `-- protected.html.tmpl
```

Test-driven development takes a little getting used to, but can be a very powerful tool.

## More

A lot more documentation and examples by many different authors can be found in the
[mojo.js wiki](https://github.com/mojolicious/mojo.js/wiki).

## Support

If you have any questions the documentation might not yet answer, don't hesitate to ask in the
[Forum](https://github.com/mojolicious/mojo.js/discussions), or on [IRC](https://web.libera.chat/#mojo).
