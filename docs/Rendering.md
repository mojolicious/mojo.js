# Rendering

This document explains content generation with the [mojo.js](https://mojojs.org) renderer.

## Concepts

Essentials every mojo.js developer should know.

### Renderer

The renderer is a tiny black box turning stash data into actual responses utilizing multiple template engines and data
encoding modules.

```
{text: 'Hello.'}               -> 200 OK, text/html, 'Hello.'
{json: {x: 3}}                 -> 200 OK, application/json, '{"x":3}'
{text: 'Oops.', status: '410'} -> 410 Gone, text/html, 'Oops.'
```

Views can be automatically detected if enough information is provided by the developer or routes. View names are
expected to follow the `view.format.engine` scheme, with `view` defaulting to `controller/action` or the route name,
`format` defaulting to `html` and `engine` to `mt`.

```
{controller: 'users', action: 'list'} -> 'users/list.html.mt'
{view: 'foo', format: 'txt'}          -> 'foo.txt.mt'
{view: 'foo', engine => 'haml'}       -> 'foo.html.haml'
```

All views should be in the `views` directories of the application, which can be customized with
`app.renderer.viewPaths`.

```js
app.renderer.viewPaths.unshift(app.home.child('more-views').toString());
```

The renderer can be easily extended to support additional template engine with plugins, but more about that later.

### Templates

The default template engine used by mojo.js is [@mojojs/template](https://www.npmjs.com/package/@mojojs/template). It
allows the embedding of JavaScript code right into actual content using a small set of special tags. Templates are
compiled to `async` functions, so you can even use `await`.

```
<% JavaScript code %>
<%= JavaScript expression, replaced with XML escaped result %>
<%== JavaScript expression, replaced with result %>
<%# Comment, useful for debugging %>
<%% Replaced with "<%", useful for generating templates %>
% JavaScript code line, treated as "<% line =%>" (explained later)
%= JavaScript expression line, treated as "<%= line %>"
%== JavaScript expression line, treated as "<%== line %>"
%# Comment line, useful for debugging
%% Replaced with "%", useful for generating templates
```

Tags and lines work pretty much the same, but depending on context one will usually look a bit better. Semicolons get
automatically appended to all expressions.

```
<% const i = 10; %>
<ul>
  <% for (let j = 1; i > j; j++) { %>
    <li>
      <%= j %>
    </li>
  <% } %>
</ul>
```
```
% const i = 10;
<ul>
  % for (let j = 1; i > j; j++) {
    <li>
      %= j
    </li>
  % }
</ul>
```

Aside from differences in whitespace handling, both examples generate similar JavaScript code, a naive translation
could look like this.

```js
let __output = '';
const i = 10;
__output += '<ul>';
for (let j = 1; i > j; j++) {
  __output += '<li>';
  __output += __escape(j);
  ___output += '</li>';
}
__output += '</ul>';
return __output;
```

By default the characters `<`, `>`, `&`, `'` and `"` will be escaped in results from JavaScript expressions, to prevent
XSS attacks against your application.

```
<%= 'I ♥ mojo.js!' %>
<%== '<p>I ♥ mojo.js!</p>' %>
```

Newline characters after code and expression blocks can be trimmed by adding an additional equal sign to the end of a
tag.

```
<% for (let i = 1; i <= 3; i++) { =%>
  <%= 'The code blocks around this expression are not visible in the output' %>
<% } =%>
```

Code lines are automatically trimmed and always completely invisible in the output.

```
% for (let i = 1; i <= 3; i++) {
  <%= 'The code lines around this expression are not visible in the output' %>
% }
```

At the beginning of the template, stash values get automatically initialized as normal variables. Additionally there is
also a `stash` variable and the context object is available as `ctx`, giving you full access to request information and
helpers.

```js
ctx.stash.name = 'tester';
```
```
Hello <%= name %> from <%= ctx.req.ip %>.
```

## Basics

Most commonly used features every mojo.js developer should know about.

### Rendering Templates

The renderer will always try to detect the right template, but you can also use the `view` stash value to render a
specific one. Everything before the last slash will be interpreted as the subdirectory path in which to find the
template.

```js
// views/foo/bar/baz.*.*
await ctx.render({view: 'foo/bar/baz'});
```

Choosing a specific `format` and `handler` is just as easy.

```js
// views/foo/bar/baz.txt.mt
await ctx.render({view: 'foo/bar/baz', format: 'txt', handler: 'mt'});
```

If you're not sure in advance if a template actually exists, you can also use `maybe` render option to try multiple
alternatives.

```js
if (await ctx.render({view: 'localized/baz', maybe: true}) === false) {
  await ctx.render({view: 'foo/bar/baz'});
}
```

### Rendering to Strings

Sometimes you might want to use the rendered result directly instead of generating a response, for example, to send
emails, this can be done with `ctx.renderToString`.

```js
const html = await ctx.renderToString({view: 'email/confirmation'});
```

### Template Variants

To make your application look great on many different devices you can also use the `variant` render option to choose
between different variants of your templates.

```js
// views/foo/bar/baz.html+phone.mt
// views/foo/bar/baz.html.mt
await ctx.render({view: 'foo/bar/baz', variant: 'phone'});
```

This can be done very liberally since it only applies when a template with the correct name actually exists and falls
back to the generic one otherwise.

### Rendering Inline Templates

Some engines such as `mt` allow templates to be passed inline.

```js
await ctx.render({inline: 'The result is <%= 1 + 1 %>.'});
```

Since auto-detection depends on a path you might have to supply an `engine` name too.

```js
await ctx.render({inline: "The result is {{ result }}", engine => 'handlebars');
```

### Rendering Text

Character strings (as well as binary buffers) can be rendered with the `text` stash value.

```js
await ctx.render({text: 'I ♥ Mojolicious!'});
```

### Rendering JSON

The `json` stash value allows you to pass JavaScript data structures to the renderer which get directly encoded to
JSON.

```js
await ctx.render({json: {foo: [1, 'test', 3]}});
```

### Status Code

Response status codes can be changed with the `status` stash value.

```js
await ctx.render({text: 'Oops.', status: 500});
```

### Content Type

The `Content-Type` header of the response is actually based on the MIME type mapping of the `format` render option.

```js
// Content-Type: text/plain
await ctx.render({text: 'Hello.', format: 'txt'});

// Content-Type: image/png
await ctx.render({text: Buffer.from(...), format: 'png'});
```

While most common MIME types are supported by default, you can be easily add your own via `app.mime`.

```js
app.mime.custom.foo = 'application/foo';
```

### Stash Data

Any of the native JavaScript data types can be passed to templates as references through `ctx.stash`.

```js
ctx.stash.description = 'web framework';
ctx.stash.frameworks  = ['Catalyst', 'Mojolicious', 'mojo.js'];
ctx.stash.spinoffs    = {minion: 'job queue'};
```
```
<%= description %>
<%= frameworks[1] %>
<%= spinoffs.minion %>
```

Since everything is just JavaScript, normal control structures just work.

```
% for (const framework of frameworks) {
  <%= framework %> is a <%= description %>.
% }
```
```
% const description = spinoffs.minion;
% if (description !== undefined) {
  Minion is a <%= description %>.
% }
```

For templates that might get rendered in different ways and where you're not sure if a stash value will actually be
set, you can just use `ctx.stash`.

```
% const spinoffs = ctx.stash.spinoffs;
% if (spinoffs !== undefined) {
  Minion is a <%= $spinoffs.minion %>.
% }
```

### Helpers

Helpers are little functions you can use in templates as well as controller code.

```
%# Template
%= ctx.inspect([1, 2, 3])
```
```js
// Controller
const serialized = ctx.inspect([1, 2, 3]);
```

#### Generic Helpers

These generic helpers are currently available by default:

##### `currentRoute`

```js
const name = ctx.currentRoute();
```

Get the current route name.

##### `inspect`

```js
const serialized = ctx.inpsect({hello: 'world'});
```

Serialize data structure for debugging.

#### Exception Helpers

These exception helpers are currently available by default:

##### `exception`

```js
await ctx.exception(new Error('Something went wrong!'));
```

Render an exception response in the appropriate format by delegating to more specific exception helpers for HTTP and
WebSockets.

##### `htmlException`

```js
await ctx.htmlException(new Error('Something went wrong!'));
```

Render an HTML response and set the response status to `500`.

##### `htmlNotFound`

```js
await ctx.htmlNotFound();
```

Render an HTML response and set the response status to `404`.

##### `httpException`

```js
await ctx.httpException(new Error('Something went wrong!'));
```

Log the exception and render an HTTP exception response in the appropriate format and set the response status to `500`
by delegating to more specific exception helpers for HTML, JSON and plain text rendering.

##### `jsonException`

```js
await ctx.jsonException(new Error('Something went wrong!'));
```

Render a JSON response and set the response status to `500`.

##### `jsonNotFound`

```js
await ctx.jsonNotFound();
```

Render a JSON response and set the response status to `404`.

##### `notFound`

```js
await ctx.notFound();
```

Render a not found response in the appropriate format by delegating to more specific exception helpers for HTTP and
WebSockets.

##### `txtException`

```js
await ctx.txtException(new Error('Something went wrong!'));
```

Render a plain text response and set the response status to `500`.

##### `txtNotFound`

```js
await ctx.txtNotFound();
```

Render a plain text response and set the response status to `404`.

##### `websocketException`

```js
await ctx.websocketException(new Error('Something went wrong!'));
```

Log the exception and close the WebSocket connection with an `1011` error code.

#### View Helpers

These view helpers are currently available by default:

##### `include`

```
%= await ctx.include('_navbar')
```

Include a partial template.

##### `mojoFaviconTag`

```
%= ctx.mojoFaviconTag()
```

Generate `<link>` tag for the default mojo.js favicon.

##### `scriptTag`

```
%= ctx.scriptTag('/bootstrap/bootstrap.bundle.min.js')
```

Generate `<script>` tag for JavaScript file.

##### `styleTag`

```
%= ctx.styleTag('/bootstrap/bootstrap.min.css')
```

Generate `<link>` tag for CSS file.

##### `tag`

```
%= tag 'div'
%= tag 'div', {class: 'wrapper'}
%= tag 'div', {class: 'wrapper'}, 'Hello World!'
```

Generate HTML tag.

### Content Negotiation

For resources with different representations and that require truly RESTful content negotiation you can also use
`ctx.respondTo()`.

```js
// GET /hello (Accept: application/json) -> "json"
// GET /hello (Accept: application/xml)  -> "xml"
// GET /hello.json                       -> "json"
// GET /hello.xml                        -> "xml"
await ctx.respondTo({
  json: ctx => ctx.render({json: {hello: 'world'}}),
  xml:  ctx => ctx.render({text: '<hello>world</hello>', format: 'xml'})
});
```

The best possible representation will be automatically selected from the `ext` stash value or `Accept` request header.

```js
// GET /hello (Accept: application/json) -> "json"
// GET /hello (Accept: text/html)        -> "html"
// GET /hello (Accept: image/png)        -> "any"
// GET /hello.json                       -> "json"
// GET /hello.html                       -> "html"
// GET /hello.png                        -> "any"
await ctx.respondTo({
  json: ctx => ctx.render({json: {hello: 'world'}}),
  html: ctx => ctx.render({template: 'hello'}, {message: 'world'}),
  any:  ctx => ctx.render({text: '', status: 204})
});
```

And if no viable representation could be found, the `any` fallback will be used or an empty `204` response rendered
automatically.

```js
// GET /hello                      -> "html"
// GET /hello (Accept: text/html)  -> "html"
// GET /hello (Accept: text/xml)   -> "xml"
// GET /hello (Accept: text/plain) -> null
// GET /hello.html                 -> "html"
// GET /hello.xml                  -> "xml"
// GET /hello.txt                  -> null
const format = ctx.accepts(['html', 'xml']);
if (format !== null) {
  ...
}
```

For even more advanced negotiation logic you can also use `ctx.accepts()`.

## Support

If you have any questions the documentation might not yet answer, don't hesitate to ask in the
[Forum](https://github.com/mojolicious/mojo.js/discussions) or the official IRC channel `#mojo` on `irc.libera.chat`
([chat now](https://web.libera.chat/#mojo)!).
