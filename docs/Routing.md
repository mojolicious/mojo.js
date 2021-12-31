
# Routing

This document contains a simple and fun introduction to the Mojolicious router and its underlying concepts.

## Concepts

Essentials every [mojo.js](https://mojojs.org) developer should know.

### Dispatcher

The foundation of every web framework is a tiny black box connecting incoming requests with code generating the
appropriate response.

```
GET /user/show/1 -> ctx.render({text: 'Daniel'});
```

This black box is usually called a dispatcher. There are many implementations using different strategies to establish
these connections, but pretty much all are based around mapping the path part of the request URL to some kind of
response generator.

```
/user/show/2 -> ctx.render({text: 'Isabell'});
/user/show/3 -> ctx.render({text: 'Sara'});
/user/show/4 -> ctx.render({text: 'Stefan'});
/user/show/5 -> ctx.render({text: 'Fynn'});
```

While it is very well possible to make all these connections static, it is also rather inefficient. That's why regular
expressions are commonly used to make the dispatch process more dynamic.

```
qr!/user/show/(\d+)! -> ctx.render({text: users[match[1]]});
```

Modern dispatchers have pretty much everything HTTP has to offer at their disposal and can use many more variables than
just the request path, such as request method and headers like `Host`, `User-Agent` and `Accept`.

```
GET /user/show/23 HTTP/1.1
Host: mojolicious.org
User-Agent: Mojolicious (Perl)
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
```

### Routes

While regular expressions are quite powerful they also tend to be unpleasant to look at and are generally overkill for
ordinary path matching.

```
qr!/user/admin/(\d+)! -> ctx.render({text: users[match[1]]);
```

This is where routes come into play, they have been designed from the ground up to represent paths with placeholders.

```
/user/admin/:id -> ctx.render({text: users[id]});
```

The only difference between a static path and the route above is the `:id` placeholder. One or more placeholders can be
anywhere in the route.

```
/user/:role/:id
```

A fundamental concept of the mojo.js router is that extracted placeholder values are turned into an object.

```
/user/admin/23 -> /user/:role/:id -> {role: 'admin', id: 23}
```

This object is basically the center of every mojo.js application, you will learn more about this later on. Internally,
routes get compiled to regular expressions, so you can get the best of both worlds with a little bit of experience.

```
/user/admin/:id -> /(?:^\/user\/admin\/([^\/.]+))/
```

A trailing slash in the path is always optional.

```
/user/admin/23/ -> /user/:role/:id -> {role: 'admin', id: 23}
```

### Reversibility

One more huge advantage routes have over regular expressions is that they are easily reversible, extracted placeholders
can be turned back into a path at any time.

```
/sebastian -> /:name -> {name: 'sebastian'}
{name: 'sebastian'} -> /:name -> /sebastian
```

Every placeholder has a name, even if it's just an empty string.

### Standard Placeholders

Standard placeholders are the simplest form of placeholders, they use a colon prefix and match all characters except
`/` and `.`, similar to the regular expression `([^/.]+)`.

```
/hello              -> /:name/hello -> null
/sebastian/23/hello -> /:name/hello -> null
/sebastian.23/hello -> /:name/hello -> null
/sebastian/hello    -> /:name/hello -> {name: 'sebastian'}
/sebastian23/hello  -> /:name/hello -> {name: 'sebastian23'}
/sebastian 23/hello -> /:name/hello -> {name: 'sebastian 23'}
```

All placeholders can be surrounded by < and > to separate them from the surrounding text.

```
/hello             -> /<:name>hello -> null
/sebastian/23hello -> /<:name>hello -> null
/sebastian.23hello -> /<:name>hello -> null
/sebastianhello    -> /<:name>hello -> {name: 'sebastian'}
/sebastian23hello  -> /<:name>hello -> {name: 'sebastian23'}
/sebastian 23hello -> /<:name>hello -> {name: 'sebastian 23'}
```

The colon prefix is optional for standard placeholders that are surrounded by `<` and `>`.

```
/i♥mojolicious -> /<one>♥<two> -> {one: 'i', two: 'mojolicious'}
```

### Relaxed Placeholders

Relaxed placeholders are just like standard placeholders, but use a hash prefix and match all characters except `/`,
similar to the regular expression `([^/]+)`.

```
/hello              -> /#name/hello -> null
/sebastian/23/hello -> /#name/hello -> null
/sebastian.23/hello -> /#name/hello -> {name: 'sebastian.23'}
/sebastian/hello    -> /#name/hello -> {name: 'sebastian'}
/sebastian23/hello  -> /#name/hello -> {name: 'sebastian23'}
/sebastian 23/hello -> /#name/hello -> {name: 'sebastian 23'}
```

They can be especially useful for manually matching file names with extensions.

```
/music/song.mp3 -> /music/#filename -> {filename: 'song.mp3'}
```

### Wildcard Placeholders

Wildcard placeholders are just like the two types of placeholders above, but use an asterisk prefix and match
absolutely everything, including `/` and `.`, similar to the regular expression `(.+)`.

```
/hello              -> /*name/hello -> null
/sebastian/23/hello -> /*name/hello -> {name: 'sebastian/23'}
/sebastian.23/hello -> /*name/hello -> {name: 'sebastian.23'}
/sebastian/hello    -> /*name/hello -> {name: 'sebastian'}
/sebastian23/hello  -> /*name/hello -> {name: 'sebastian23'}
/sebastian 23/hello -> /*name/hello -> {name: 'sebastian 23'}
```

They can be useful for manually matching entire file paths.

```
/music/rock/song.mp3 -> /music/*filepath -> {filepath: 'rock/song.mp3'}
```

## Basics

Most commonly used features every mojo.js developer should know about.

### Minimal Route

The `router` property of every mojo.js application contains a router object you can use to generate route structures.

```js
import mojo from '@mojojs/core';

// Application
const app = mojo();

// Router
const router = app.router;

// Route
router.get('/welcome').to({controller: 'foo', action: 'welcome'});

app.start();
```

The minimal route above will load and instantiate the controller `controllers/foo.js` and call its `welcome` method.
Routes are usually configured in the main application script (often called `index.js`), but the router can be accessed
from everywhere (even at runtime).

```js
// Controller
export default class FooController {

  // Action
  async welcome(ctx) {
    // Render response
    await ctx.render({text: 'Hello there.'});
  }
}
```

All routes match in the same order in which they were defined, and matching stops as soon as a suitable route has been
found. So you can improve the routing performance by declaring your most frequently accessed routes first. A routing
cache will also be used automatically to handle sudden traffic spikes more gracefully.

### Routing Destination

After you start a new route with methods like `get`, you can also give it a destination in the form of an object using
the chained method `to`.

```js
// GET /welcome -> {controller: 'foo', action: 'welcome'}
router.get('/welcome').to({controller: 'foo', action: 'welcome'});
```

Now if the route matches an incoming request it will use the content of this object to try and find appropriate code to
generate a response.

### HTTP Methods

There are already shortcuts for the most common HTTP request methods like `post`, and for more control `any` accepts an
optional array with arbitrary request methods as first argument.

```js
// PUT /hello  -> null
// GET /hello  -> {controller: 'foo', action: 'hello'}
router.get('/hello').to({controller: 'foo', action: 'hello'});

// PUT /hello -> {controller: 'foo', action: 'hello'}
router.put('/hello').to({controller: 'foo', action: 'hello'});

// POST /hello -> {controller: 'foo', action: 'hello'}
router.post('/hello').to({controller: 'foo', action: 'hello'});

// GET|POST /bye  -> {controller: 'foo', action: 'bye'}
router.any(['GET', 'POST'], '/bye').to({controller: 'foo', action: 'bye'});

// * /whatever -> {controller: 'foo', action: 'whatever'}
router.any('/whatever').to({controller: 'foo', action: 'whatever'});
```

There is one small exception, `HEAD` requests are considered equal to `GET`, but content will not be sent with the
response even if it is present.

```js
// GET /test  -> {controller: 'bar', action: 'test'}
// HEAD /test -> {controller: 'bar', action: 'test'}
router.get('/test').to({controller: 'bar', action: 'test'});
```

### IRIs

IRIs are handled transparently, that means paths are guaranteed to be unescaped and decoded from bytes to characters.

```js
// GET /☃ (Unicode snowman) -> {controller: 'foo', action: 'snowman'}
router.get('/☃').to({controller: 'foo', action: 'snowman'});
```

### Stash

The generated object of a matching route is actually the center of the whole mojo.js request cycle. We call it the
stash, and it persists until a response has been generated.

```js
// GET /bye -> {controller: 'foo', action: 'bye', mymessage: 'Bye'}
router.get('/bye').to({controller: 'foo', action: 'bye', mymessage: 'Bye'});
```

There are a few stash values with special meaning, such as `controller` and `action`, but you can generally fill it
with whatever data you need to generate a response. Once dispatched the whole stash content can be changed at any time.

```js
// Action
async bye(ctx) {

  // Get message from stash
  const msg = ctx.stash.mymessage;

  // Change message in stash
  ctx.stash.mymessage = 'Welcome';

  // Render a template that might use stash values
  await ctx.render({template: 'bye'});
}
```

### Nested Routes

It is also possible to build tree structures from routes to remove repetitive code. A route with children can't match on
its own though, only the actual endpoints of these nested routes can.

```js
// GET /foo     -> undef
// GET /foo/bar -> {controller: 'foo', action: 'bar'}
const foo = router.any('/foo').to({controller: 'foo'});
foo.get('/bar').to({action: 'bar'});
```

The stash is simply inherited from route to route and newer values override old ones.

```js
// GET /cats      -> {controller: 'cats', action: 'index'}
// GET /cats/nyan -> {controller: 'cats', action: 'nyan'}
// GET /cats/lol  -> {controller: 'cats', action: 'default'}
const cats = router.any('/cats').to({controller: 'cats', action: 'default'});
cats.get('/').to({action: 'index'});
cats.get('/nyan').to({action: 'nyan'});
cats.get('/lol');
```

With a few common prefixes you can also greatly improve the routing performance of applications with many routes,
because children are only tried if the prefix matched first.

### Special Stash Values

When the dispatcher sees `controller` and `action` values in the stash it will always try find a controller instance and
method to dispatch to. By default, the router will load and instantiate all controller classes from the `controllers`
directory during application startup.

```js
// Application ("index.js")
import mojo from '@mojojs/core';

const app = mojo();

const router = app.router;

// GET /bye -> "controllers/foo.js"
router.get('/bye').to({controller: 'foo', action: 'bye'});

app.start();
```
```js
// Controller ("controllers/foo.js")
export default class FooController {

  // Action
  async bye(ctx) {
    // Render response
    await ctx.render({text: 'Good bye.'});
  }
}
```

Controller classes are perfect for organizing code in larger projects. There are more dispatch strategies, but because
controllers are the most commonly used ones they also got a special shortcut in the form of `controller#action`.

```js
// GET /bye -> {controller: 'foo', action: 'bye'}
router.get('/bye').to('foo#bye');
```

### Route to Function

The `fn` stash value, which won't be inherited by nested routes, can be used to bypass controllers and execute a
function instead.

```js
router.get('/bye').to({fn: async ctx => {
  await ctx.render({text => 'Good bye.'});
});
```

But you can also just pass the callback directly to `get` (and similar methods), which usually looks much better.

```js
router.get('/bye', async ctx => {
  await ctx.render({text => 'Good bye.'});
});
```

### Named Routes

Naming your routes will allow backreferencing in many methods and helpers throughout the whole framework, most of which
internally rely on `ctx.urlFor` for this.

```js
// GET /foo/marcus -> {controller: 'foo', action: 'bar', user: 'marcus'}
router.get('/foo/:user').to('foo#bar').name('baz');
```
```js
// Generate URL "/foo/marcus" for route "baz" (in previous request context)
const url = ctx.urlFor('baz');

// Generate URL "/foo/jan" for route "baz"
const url = ctx.urlFor('baz', {user: 'jan'});
```

You can manually assign a name or let the router generate one automatically, which would be equal to the route itself
with all non-word characters replaced with the `_` character. Custom names have a higher precedence.

```js
// GET /foo/bar ("foobar")
router.get('/foo/bar').to('test#stuff');
```
```js
// Generate URL "/foo/bar"
const url = ctx.urlFor('foo_bar');
```

To refer to the current route you can use the reserved name `current` or no name at all.

```js
// Generate URL for current route
const url = ctx.urlFor('current');
const url = ctx.urlFor();
```

To check or get the name of the current route you can use the helper `ctx.currentRoute`.

```js
// Name for current route
const name = ctx.currentRoute();

// Check route name in code shared by multiple routes
if (if ctx.currentRoute() === 'login') ctx.stash.button = 'green';
```

### WebSockets

With the `websocket` method of the router you can restrict access to WebSocket handshakes, which are normal `GET`
requests with some additional information.

```js
// WebSocket handshake route ("index.js")
app.websocket('/echo').to('foo#echo');
```
```js
// Controller ("controllers/foo.js")
export default class FooController {

  // Action
  echo(ctx) {
    ctx.plain(async ws => {
      for await (const message of ws) {
        await ws.send(`echo: ${message}`);
      }
    });
  }
}
```

The context methods `plain` and `json` can be used to accept the incoming WebSocket connection either in plain
text/binary message mode, or with automatic JSON encoding and decoding.

```js
export default class BarController {

  addFuturamaQuote(ctx) {
    // Activate JSON mode
    ctx.json(async ws => {
      for await (const data of ws) {

        // Add a Futurama quote to JSON objects
        if (typeof data === 'object') {
          data.quote = 'Shut up and take my money!';
          await ws.send(data);
        }

        // Close the connection for everything else
        else {
          ws.close();
        }
      }
    });
  }
}
```

The `close` method is used to end an established WebSocket connection. To reject an incoming connection completely, just
don't do anything at all, the rejection will happen automatically.

```
GET /echo HTTP/1.1
Host: mojolicious.org
User-Agent: Mojolicious (Perl)
Connection: Upgrade
Upgrade: websocket
Sec-WebSocket-Key: IDM3ODE4NDk2MjA1OTcxOQ==
Sec-WebSocket-Version: 13

HTTP/1.1 101 Switching Protocols
Server: Mojolicious (Perl)
Date: Tue, 03 Feb 2015 17:08:24 GMT
Connection: Upgrade
Upgrade: websocket
Sec-WebSocket-Accept: SWsp5N2iNxPbHlcOTIw8ERvyVPY=
```

On the protocol level, the connection gets established with a `101` HTTP response. The handshake request can contain
any number of arbitrary HTTP headers, this can be very useful for authentication.

## Support

If you have any questions the documentation might not yet answer, don't hesitate to ask in the
[Forum](https://github.com/mojolicious/mojo.js/discussions) or the official IRC channel `#mojo` on `irc.libera.chat`
([chat now](https://web.libera.chat/#mojo)!).
