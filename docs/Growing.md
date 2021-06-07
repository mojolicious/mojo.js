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
