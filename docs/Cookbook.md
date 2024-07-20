
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

### Systemd

To manage the web server with systemd, you can use a unit configuration file like this.

```
[Unit]
Description=My mojo.js application
After=network.target

[Service]
Type=simple
User=sri
Environment="NODE_ENV=production"
ExecStart=node /home/sri/myapp/myapp.js server -l http://*:8080

[Install]
WantedBy=multi-user.target
```

And while the default logger will already work pretty well, we also have native support for the journald format. That
means if you activate the `systemdFormatter` you can get proper log level mapping and syntax highlighting for your
journal too.

```js
import mojo, {Logger} from '@mojojs/core';

const app = mojo();
app.log.formatter = Logger.systemdFormatter;

app.get('/', ctx => ctx.render({text: 'Hello systemd!'}));

app.start();
```

You can even use systemd for
[socket activation](https://www.freedesktop.org/software/systemd/man/systemd.socket.html). The socket will be passed to
your server as file descriptor `3`, so all you have to do is to use a slightly different listen option.

```
ExecStart=node /home/sri/myapp/myapp.js server -l http://*?fd=3
```

### Reloading

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

### Apache/CGI

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

## Real-Time Web

The real-time web is a collection of technologies that include Comet (long polling), EventSource and WebSockets, which
allow content to be pushed to consumers with long-lived connections as soon as it is generated, instead of relying on
the more traditional pull model. The built-in web server uses non-blocking I/O and is based on an event loop, which
provides many very powerful features that allow real-time web applications to scale up to thousands of concurrent
client connections.

### Backend Web Services

Since the built-in HTTP user-agent is also based on the event loop, it won't block the built-in web server, even for
high latency backend web services.

```js
import mojo from '@mojojs/core';

const app = mojo();

app.get('/', async ctx => {
  const res = await ctx.ua.get('http://fastapi.metacpan.org/v1/module/_search', {query: {q: 'mojolicious'}});
  const data = await res.json();
  await ctx.render({inline: metacpanTemplate}, {hits: data.hits.hits});
});

const metacpanTemplate = `
<!DOCTYPE html>
<html>
  <head><title>MetaCPAN results for "mojolicious"</title></head>
  <body>
    % for (const hit of hits) {
      <p><%= hit._source.release %></p>
    % }
  </body>
</html>
`;

app.start();
```

Thanks to `async`/`await` there is no need to use any callbacks.

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

### Adding a Configuration File

Adding a configuration file to your application is as easy as adding a file to its home directory and loading the
plugin `jsonConfigPlugin`. The default name for the config file is `config.json`, and it is possible to have mode
specific config files like `config.development.json`.

```
$ echo '{"name": "my mojo.js application"}' > config.json
```

Configuration files themselves are just plain JSON files containing settings that will get merged into `app.config`,
which is also available as `ctx.config`.

```js
import mojo, {jsonConfigPlugin} from '@mojojs/core';

const app = mojo();
app.plugin(jsonConfigPlugin);

app.get('/', async ctx => {
  await ctx.render({json: {name: ctx.config.name}});
});

app.start();
```

Alternatively you can also use configuration files in the YAML format with `yamlConfigPlugin`.

### Adding Plugins to Your Application

To organize your code better and to prevent helpers from cluttering your application, you can use application specific
plugins.

```
$ mkdir plugins
$ touch plugins/my-helpers.js
```

They work just like normal plugins.

```js
export default function myHelpersPlugin (app) {
  app.addHelper('renderWith.header', async (ctx, ...args) => {
    ctx.res.set('X-Mojo', 'I <3 mojo.js!');
    await ctx.render(...args);
  });
}
```

You can have as many application specific plugins as you like, the only difference to normal plugins is that you load
them directly from the file.

```js
import mojo from '@mojojs/core';
import myHelpersPlugin from './plugins/my-helpers.js';

const app = mojo();
app.plugin(myHelpersPlugin);

app.get('/', async ctx => {
  await ctx.renderWith.header({text: 'I ♥ mojo.js!'});
});

app.start();
```

Of course these plugins can contain more than just helpers.

### Adding Commands to Your Application

By now you've probably used many of the built-in commands, like `get` and `server`, but did you know that you can just
add new ones and that they will be picked up automatically by the command line interface if they are placed in a `cli`
directory in your application's home directory?

```
$ mkdir cli
$ touch cli/spy.js
```

Every command is async and has full access to the application object `app`.

```js
export default async function spyCommand(app, args) {
  const subCommand = args[2];
  if (subCommand === 'secrets') {
    console.warn(app.secrets);
  } else if (subCommand === 'mode') {
    console.warn(app.mode);
  }
}

spyCommand.description = 'Spy on application';
spyCommand.usage = `Usage: APPLICATION spy [OPTIONS]

  node index.js spy

Options:
  -h, --help   Show this summary of available options
`;

```

Command line arguments are passed right through and you can parse them with whatever module you prefer.

```
$ node index.js spy secrets
["s3cret"]
```

The options `-h` and `--help` are handled automatically for all commands.

### Running Code Against Your Application

Ever thought about running a quick one-liner against your mojo.js application to test something? Thanks to the `eval`
command you can do just that, the application object itself can be accessed via `app`.

```
$ node index.js eval 'console.log(app.static.publicPaths)'
["/home/sri/myapp/public"]
```

The verbose option will automatically print the return value or returned data structure to `stdout`.

```
$ node index.js eval -v 'app.renderer.viewPaths'
["/home/sri/myapp/views"]
```

## More

A lot more documentation and examples by many different authors can be found in the
[mojo.js wiki](https://github.com/mojolicious/mojo.js/wiki).

## Support

If you have any questions the documentation might not yet answer, don't hesitate to ask in the
[Forum](https://github.com/mojolicious/mojo.js/discussions), or on [IRC](https://web.libera.chat/#mojo).
