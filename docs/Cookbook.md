
# Cookbook

This document contains many fun recipes for cooking with [mojo.js](https://mojojs.org).

## Concepts

Essentials every [mojo.js](https://mojojs.org) developer should know.

### Reverse Proxy

A reverse proxy architecture is a deployment technique used in many production environments, where a `reverse proxy`
server is put in front of your application to act as the endpoint accessible by external clients. It can provide a lot
of benefits, like terminating SSL connections from the outside, limiting the number of concurrent open sockets towards
the [mojo.js](https://mojojs.org) application, balancing load across multiple instances, or supporting several
applications through the same IP/port.

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
the [mojo.js](https://mojojs.org) application.

As an example, compare a sample request from the client and what the [mojo.js](https://mojojs.org) application
receives:

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

## Deployment

Getting [mojo.js](https://mojojs.org) applications running on different platforms.

### Built-in Web Server

[mojo.js](https://mojojs.org) contains a very portable Node.js based HTTP and WebSocket server. It can be used for web
applications of any size and scales very well.

```
$ node myapp.js server
Web application available at http://0.0.0.0:3000/
```

It is available to every application through the `server` command, which has many configuration options and is known to
work on every platform Node.js works on.

```
$ node myapp.js server -h
...List of available options...
```

Another huge advantage is that it supports TLS and WebSockets out of the box, a self-signed development certificate for
testing purposes is built right in, so it just works.

```
$ node myapp.js server -l https://127.0.0.1:3000
Web application available at https://127.0.0.1:3000/
```

To manage the web server with systemd, you can use a unit configuration file like this.

```
[Unit]
Description=My mojo.js application
After=network.target

[Service]
Type=simple
User=sri
ExecStart=NODE_ENV=production node /home/sri/myapp/myapp.js server -l http://*:8080

[Install]
WantedBy=multi-user.target
```

## Reloading

After reading the [Introduction](Introduction.md) you should already be familiar with
[nodemon](https://www.npmjs.com/package/nodemon). It is a restarter that starts a new web server process whenever a
file in your project changes, and should therefore only be used during development.

```
$ npm install nodemon
...

$ npx nodemon myapp.js server
...
[39248] Web application available at http://127.0.0.1:3000/
```

## Apache/CGI

CGI is supported out of the box and your [mojo.js](https://mojojs.org) application will automatically detect that it is
executed as a CGI script. Its use in production environments is discouraged though, because as a result of how CGI
works, it is very slow and many web servers are making it exceptionally hard to configure properly. Additionally, many
real-time web features, such as WebSockets, are not available.

```
ScriptAlias / /home/sri/myapp/index.js/
```

### Nginx

One of the most popular setups these days is web applications behind an [Nginx](https://nginx.org/) reverse proxy,
which even supports WebSockets in newer versions.

```
upstream myapp {
  server 127.0.0.1:8080;
}
server {
  listen 80;
  server_name localhost;
  location / {
    proxy_pass http://myapp;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

### Apache/mod_proxy

Another good reverse proxy is [Apache](https://httpd.apache.org/) with `mod_proxy`, the configuration looks quite
similar to the Nginx one above. And if you need WebSocket support, newer versions come with `mod_proxy_wstunnel`.

```
<VirtualHost *:80>
  ServerName localhost
  <Proxy *>
    Require all granted
  </Proxy>
  ProxyRequests Off
  ProxyPreserveHost On
  ProxyPass /echo ws://localhost:8080/echo
  ProxyPass / http://localhost:8080/ keepalive=On
  ProxyPassReverse / http://localhost:8080/
  RequestHeader set X-Forwarded-Proto "http"
</VirtualHost>
```

### Envoy

[mojo.js](https://mojojs.org) applications can be deployed on cloud-native environments that use
[Envoy](https://www.envoyproxy.io/), such as with this reverse proxy configuration similar to the Apache and Nginx ones
above.

```
static_resources:
  listeners:
  - name: listener_0
    address:
      socket_address: { address: 0.0.0.0, port_value: 80 }
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          codec_type: auto
          stat_prefix: index_http
          route_config:
            name: local_route
            virtual_hosts:
            - name: service
              domains: ["*"]
              routes:
              - match:
                  prefix: "/"
                route:
                  cluster: local_service
          upgrade_configs:
          - upgrade_type: websocket
          http_filters:
          - name: envoy.filters.http.router
            typed_config:
  clusters:
  - name: local_service
    connect_timeout: 0.25s
    type: strict_dns
    lb_policy: round_robin
    load_assignment:
      cluster_name: local_service
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address: { address: mojo, port_value: 8080 }
```

While this configuration works for simple applications, Envoy's typical use case is for implementing proxies of
applications as a "service mesh" providing advanced filtering, load balancing, and observability features, such as seen
in [Istio](https://istio.io/latest/docs/ops/deployment/architecture/). For more examples, visit the
[Envoy documentation](https://www.envoyproxy.io/docs/envoy/latest/start/start).

## Application

Fun [mojo.js](https://mojojs.org) application hacks for all occasions.

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
[Forum](https://github.com/mojolicious/mojo.js/discussions), on [Matrix](https://matrix.to/#/#mojo:matrix.org), or
[IRC](https://web.libera.chat/#mojo).
