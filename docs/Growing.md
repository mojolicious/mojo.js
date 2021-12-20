# Growing

This document explains the process of starting a single file prototype from scratch and growing it into a
well-structured [mojo.js](https://mojojs.org) application.

## Concepts

Essentials every mojo.js developer should know.

### Model View Controller

MVC is a software architectural pattern for graphical user interface programming originating in Smalltalk-80, that
separates application logic, presentation and input.

```
         +------------+    +-------+    +------+
Input -> | Controller | -> | Model | -> | View | -> Output
         +------------+    +-------+    +------+
```

A slightly modified version of the pattern moving some application logic into the controller is the foundation of
pretty much every web framework these days, including mojo.js.

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

In mojo.js however we are taking this concept one step further by storing everything JSON serialized in AES-256-GCM
encrypted cookies, which is more compatible with the REST philosophy and reduces infrastructure requirements.

### Test-Driven Development

TDD is a software development process where the developer starts writing failing test cases that define the desired
functionality and then moves on to producing code that passes these tests. There are many advantages such as always
having good test coverage and code being designed for testability, which will in turn often prevent future changes from
breaking old code. Much of mojo.js was developed using TDD.

## Prototype

An important difference between mojo.js and other web frameworks is that it can operate in two modes, both as a 
full-fledged web framework, and as a single file micro web framework optimized for rapid prototyping.

### Differences

You likely know the feeling, you've got a really cool idea and want to try it as quickly as possible. That's exactly
why mojo.js applications don't need more than a single JavaScript file (in addition to `package.json`).

```
myapp                         // Application directory (created manually)
|- node_modules/
|   |- *lots of node files*
|- package.json               // Will be generated when you install mojo.js
|- myapp.js                   // Templates can be inlined in the file
```

Full mojo.js applications on the other hand follow the MVC pattern more closely and separate concerns into different
files to maximize maintainability:

```
myapp                         // Application directory (created manually)
|- config.yml                 // Configuration file
|- index.js                   // Application script
|- node_modules
|   |- *lots of node files*
|- package.json               // Node package information and settings
|- test                       // Test directory
|   |- example.js             // Random test
|- controllers                // Controller directory
|   |- example.js             // Controller class
|- models                     // Model directory
|- public                     // Static file directory (served automatically)
|   |- index.html             // Static HTML file
|- views                      // Views directory
|   |- example                // View directory for "Example" controller
|   |   |- welcome.html.ejs   // Template for "welcome" action
|   |- layouts                // View directory for layout templates
|   |   |- default.html.ejs   // Layout template
```

Both application skeletons can be automatically generated with the commands `npx mojo create-lite-app` and
`npx mojo create-full-app`.
```
$ mkdir myapp && cd myapp
$ npm install @mojojs/core
$ npx mojo create-full-app myapp   # or
$ npx mojo create-lite-app myapp
```

Feature-wise both are almost equal, the only real differences are organizational, so each one can be gradually
transformed into the other.

## Foundation

We start our new application with a single JavaScript file.

```
$ mkdir myapp
$ cd myapp
$ npm install @mojojs/core
$ touch myapp.js
```

This will be the foundation for our login manager example application. 

``` js
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

## A bird's-eye view

It all starts with an HTTP request like this, sent by your browser.

```
GET / HTTP/1.1
Host: localhost:3000
```

Once the request has been received by the web server through the event loop, it will be passed on to mojo.js, where it
will be handled in a few simple steps.

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

## Model

In mojo.js we consider web applications simple frontends for existing business logic. That means mojo.js is by design
entirely _model_ layer agnostic, and you just use whatever JavaScript modules you like most.

```
$ mkdir models
$ touch models/users.js
```

Our login manager will use a JavaScript class abstracting away all logic related to matching usernames and passwords.
The path `models/users.js` is an arbitrary choice, and is simply used to make the separation of concerns more visible.

``` js
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
  // Query parameters
  const params = await ctx.params();
  const user = params.get('user')
  const pass = params.get('pass')

  // Check password
  if(ctx.models.users.check(user, pass) === true) return ctx.render({text: `Welcome ${user}.`});

  // Failed
  return ctx.render({text: 'Wrong username or password.'});
});

app.start();
```

The method `params` is used to access both query parameters and `POST` parameters. It returns a `Promise` that resolves
with a [URLSearchParams](https://nodejs.org/api/url.html#url_class_urlsearchparams) object.

## Support

If you have any questions the documentation might not yet answer, don't hesitate to ask in the
[Forum](https://github.com/mojolicious/mojo.js/discussions) or the official IRC channel `#mojo` on `irc.libera.chat`
([chat now](https://web.libera.chat/#mojo)!).
