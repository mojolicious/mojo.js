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

While HTTP methods such as `PUT`, `GET` and `DELETE` are not directly part of REST they go very well with it and are
commonly used to manipulate resources.

### Sessions

HTTP was designed as a stateless protocol, web servers don't know anything about previous requests, which makes
user-friendly login systems very tricky. Sessions solve this problem by allowing web applications to keep stateful
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

Traditionally all session data was stored on the server-side and only session ids were exchanged between browser and
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

Mojolicious allows you to both create a lite app and a full app. The lite app is perfect for rapid prototyping.

You can create the lite app by:

```
  $ npx mojo create-lite-app
```

This creates a single file.

```
index.js  // Templates can be inlined
```

`index.js` starts the mojo app server by default on port 3000 and renders a minimal webpage.

You can test simply by opening a web browser at url `localhost:3000`.

Full Mojolicious applications on the other hand are set-up to be a well organized distribution to maximize 
maintainability.

First, create your project folder and step into it. 

```
$ mkdir my_app
$ cd my_app
```

You can now create the full app by:

```
$ npx mojo create-full-app
```

The full app will have the following structure:

```
my_app                                // Application dir created manually
|- config.yml                         // Configuration file
|- index.js                           // Application script
|- node_modules/
|   |- *lots of node files*
|- package.json                       // Node package information and settings
|- package-lock.json                  // Describes exact tree generated in node_modules/
|- test/                              // Test directory
|   |- example.js                     // Random test
|- controllers/                       // Controller directory
|   |- example.js                     // 
|- models/                            // Model directory
|- public/                            // Static file directory (served automatically)
|   |- index.html                     // Static HTML file
|- views/                             // Views directory
|   |- example/                       // View directory for "Example"
|   |   |- welcome.html.ejs
|   |- layouts/                       // View directory for layouts
|   |   |- default.html.ejs           // Layout view/template

```

Again, both application skeletons can be automatically generated with:

```
$ npx mojo create-lite-app
$ npx mojo create-full-app
```

Feature-wise both are almost equal, the only real differences are organizational, so each one can be gradually 
transformed into the other.

### Foundation

We start our new application with a single javascript script.

```
$ mkdir my_app
$ cd my_app
$ touch myapp.pl
```

This will be the foundation for our login manager example application.

```
import mojo from '@mojojs/core';

const app = mojo();

app.get('/', ctx => ctx.render({text: 'I ♥ Mojo!'}));

app.start();
```

The built-in development web server makes working on your application a lot of fun thanks to automatic reloading.

```
$ node index.js server
```

Just save your changes and they will be automatically in effect the next time you refresh your browser.

### A bird's-eye view

It all starts with an HTTP request like this, sent by your browser.

```
GET / HTTP/1.1
Host: localhost:3000
```

Once the request has been received by the web server through the event loop, it will be passed on to Mojolicious, 
where it will be handled in a few simple steps.

1. Check if a static file exists that would meet the requirements.

2. Try to find a route that would meet the requirements.

3. Dispatch the request to this route, usually reaching one or more actions.

4. Process the request, maybe generating a response with the renderer.

5. Return control to the web server, and if no response has been generated yet, wait for a non-blocking operation to do
so through the event loop.

With our application the router would have found an action in step 2, and rendered some text in step 4, resulting in an
HTTP response like this being sent back to the browser.

```
HTTP/1.1 200 OK
Content-Length: 12
Hello World!
```

## Support

If you have any questions the documentation might not yet answer, don't hesitate to ask in the
[Forum](https://github.com/mojolicious/mojo.js/discussions) or the official IRC channel `#mojo` on `irc.libera.chat`
([chat now](https://web.libera.chat/#mojo)!).
