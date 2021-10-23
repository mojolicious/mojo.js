# Cookbook

This document contains many fun recipes for cooking with[mojo.js](https://mojojs.org).

## Concepts

Essentials every mojo.js developer should know.

### Reverse Proxy

A reverse proxy architecture is a deployment technique used in many production environments, where a `reverse proxy`
server is put in front of your application to act as the endpoint accessible by external clients. It can provide a lot
of benefits, like terminating SSL connections from the outside, limiting the number of concurrent open sockets towards
the mojo.js application, balancing load across multiple instances, or supporting several applications through the same
IP/port.

```
                ..........................................
                :                                        :
+--------+      :  +-----------+      +---------------+  :
|        |-------->|           |      |               |  :
| client |      :  |  reverse  |----->|  mojo.js      |  :
|        |<--------|   proxy   |      |  application  |  :
+--------+      :  |           |<-----|               |  :
                :  +-----------+      +---------------+  :
                :                                        :
                .. system boundary (e.g. same host) ......
```

This setup introduces some problems, though: the application will receive requests from the reverse proxy instead of
the original client; the address/hostname where your application lives internally will be different from the one
visible from the outside; and if terminating SSL, the reverse proxy exposes services via HTTPS while using HTTP towards
the mojo.js application.

As an example, compare a sample request from the client and what the mojo.js application receives:

```
client                       reverse proxy                mojo.js app
__|__              _______________|______________             ____|____
/     \            /                              \           /         \
1.2.3.4 --HTTPS--> api.example.com      10.20.30.39 --HTTP--> 10.20.30.40

GET /foo/1 HTTP/1.1                |    GET /foo/1 HTTP/1.1
Host: api.example.com              |    Host: 10.20.30.40
User-Agent: Firefox                |    User-Agent: ShinyProxy/1.2
...                                |    ...
```

However, now the client address is no longer available (which might be useful for analytics, or Geo-IP) and URLs
generated via `ctx.urlFor()` will look like this:

```
http://10.20.30.40/bar/2
```

instead of something meaningful for the client, like this:

```
https://api.example.com/bar/2
```

To solve these problems, you can configure your reverse proxy to send the missing data and tell your application about
it with the `--proxy` option.

```
$ node myapp.js server --proxy
```

## Application

Fun mojo.js application hacks for all occasions.

### Basic Authentication

Basic authentication data will be automatically extracted from the `Authorization` header.

```js
import mojo from '@mojojs/core';

const app = mojo();

app.get('/', async ctx => {

  // Check for username "Bender" and password "rocks"
  if (ctx.req.userinfo === 'Bender:rocks') return ctx.render({text: 'Hello Bender!'});

  // Require authentication
  ctx.res.set('WWW-Authenticate', 'Basic');
  return ctx.render({text: 'Authentication required!', status: 401});
});

app.start();
```

This can be combined with TLS for a secure authentication mechanism.

```
$ node myapp.js server -l 'https://*:3000?cert=./server.crt&key=./server.key'
```

## Support

If you have any questions the documentation might not yet answer, don't hesitate to ask in the
[Forum](https://github.com/mojolicious/mojo.js/discussions) or the official IRC channel `#mojo.js` on `irc.libera.chat`
([chat now](https://web.libera.chat/#mojo.js)!).
