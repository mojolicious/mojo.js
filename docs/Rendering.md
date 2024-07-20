
# Rendering

This document explains content generation with the [mojo.js](https://mojojs.org) renderer.

## Concepts

Essentials every [mojo.js](https://mojojs.org) developer should know.

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
`format` defaulting to `html` and `engine` to `tmpl`.

```
{controller: 'users', action: 'list'} -> 'users/list.html.tmpl'
{view: 'foo', format: 'txt'}          -> 'foo.txt.tmpl'
{view: 'foo', engine => 'haml'}       -> 'foo.html.haml'
```

All views should be in the `views` directories of the application, which can be customized with
`app.renderer.viewPaths`.

```js
app.renderer.viewPaths.unshift(app.home.child('more-views').toString());
```

The renderer can be easily extended to support additional template engine with plugins, but more about that later.

### Templates

The default template engine used by [mojo.js](https://mojojs.org) is
[@mojojs/template](https://www.npmjs.com/package/@mojojs/template). It allows the embedding of JavaScript code right
into actual content using a small set of special tags. Templates are compiled to `async` functions, so you can even
use `await`.

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

Whitespace characters around tags can be trimmed by adding an additional equal sign to the end of a tag.

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

Most commonly used features every [mojo.js](https://mojojs.org) developer should know about.

### Rendering Templates

The renderer will always try to detect the right template, but you can also use the `view` stash value to render a
specific one. Everything before the last slash will be interpreted as the subdirectory path in which to find the
template.

```js
// views/foo/bar/baz.*.*
await ctx.render({view: 'foo/bar/baz'});
```

Choosing a specific `format` and `engine` is just as easy.

```js
// views/foo/bar/baz.txt.tmpl
await ctx.render({view: 'foo/bar/baz', format: 'txt', engine: 'tmpl'});
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
emails, this can be done with `ctx.renderToString()`.

```js
const html = await ctx.renderToString({view: 'email/confirmation'});
```

### Template Variants

To make your application look great on many different devices you can also use the `variant` render option to choose
between different variants of your templates.

```js
// views/foo/bar/baz.html+phone.tmpl
// views/foo/bar/baz.html.tmpl
await ctx.render({view: 'foo/bar/baz', variant: 'phone'});
```

This can be done very liberally since it only applies when a template with the correct name actually exists and falls
back to the generic one otherwise.

### Rendering Inline Templates

Some engines such as `tmpl` allow templates to be passed inline.

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
  Minion is a <%= spinoffs.minion %>.
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

With a mock context object they can also be used without an active request.

```js
const ctx = app.newMockContext();
const serialized = ctx.inspect([1, 2, 3]);
```

See the [Cheatsheet](Cheatsheet.md#helpers) for a full list of helpers that are currently available by default.

### Static Files

Static files are automatically served from the `public` directories of the application, which can be customized with
`app.static.publicPaths`. And if that's not enough you can also serve them manually with `ctx.sendFile()`.

```js
import mojo from '@mojojs/core';
import Path from '@mojojs/path';

const app = mojo();

app.get('/', async ctx => {
  await ctx.sendFile(ctx.home.child('public', 'index.html'));
});

app.get('/some_download', async ctx => {
  ctx.res.set('Content-Disposition', 'attachment; filename=bar.png;');
  await ctx.sendFile(ctx.home.child('public', 'foo', 'bar.png'));
});

app.get('/leak', async ctx => {
  await ctx.sendFile(new Path('/etc/passwd'));
});

app.start();
```

To improve performance all static files have a prefix, which defaults to `/static`, and can be customized with
`app.static.prefix`. That means the file `public/foo/bar.txt` would be served as `/static/foo/bar.txt`. Since the
prefix is dynamic, you can use `ctx.urlForFile()` to generate URLs.

```js
// "/static/foo/bar.txt"
ctx.urlForFile('foo/bar.txt');
```

### Static Assets

While mojo.js does not have any special support for frontend frameworks like [Vue.js](https://vuejs.org) and
[React](https://reactjs.org), the `public/assets` directory is reserved for static assets created by bundlers like
[Webpack](https://webpack.js.org) and [Rollup.js](https://rollupjs.org) ahead of time. Asset files can be of any type,
they just have to follow the `[name].[checksum].[extensions]` naming scheme, like `myapp.ab1234cd5678ef.js`. You can
then use `ctx.urlForAsset()` or `ctx.tags.asset()` to generate URLs without having to know the checksum.

```js
// "/static/assets/myapp.ab1234cd5678ef.js"
ctx.urlForAsset('myapp.js');

// "<script src="/static/assets/myapp.ab1234cd5678ef.js"></script>"
ctx.tags.asset('myapp.js');
```

If your application runs in `development` mode, all assets will be served with a `Cache-Control: no-cache` header, to
speed up development by preventing browser caching. Additionally all assets following the
`[name].development.[extensions]` naming scheme, like `myapp.development.js`, have a higher precedence than assets with
checksums. That way you can just overwrite your assets during development, instead of having to manually delete them
each time they are rebuilt with a different checksum.

```js
// "/static/assets/foo/bar.development.js"
ctx.urlForAsset('foo/bar.js');
```

Webpack [configuration](https://webpack.js.org/configuration/) example (`webpack.config.js`):

```js
import Path from '@mojojs/path';

const isDev = process.env.NODE_ENV === 'development';

export default {
  output: {
    filename: isDev ? '[name].development.js' : '[name].[chunkhash].js',
    path: Path.currentFile().sibling('public', 'assets').toString(),
    publicPath: ''
  },

  // Add your own rules and entry point here
};
```

Rollup [configuration](https://rollupjs.org/guide/en/#configuration-files) example (`rollup.config.js`):

```js
import Path from '@mojojs/path';

const isDev = process.env.NODE_ENV === 'development';

export default {
  output: {
    entryFileNames: isDev ? '[name].development.[ext]' : '[name].[hash].[ext]',
    dir: Path.currentFile().sibling('public', 'assets').toString(),
    format: 'iife'
  },

  // Add your own rules and entry point here
};
```

Everything else is up to your bundler of choice, so you need to consult its documentation for further information. And
where you keep your asset sources, such as `.vue` and `.jsx` files, is not important, as long as your bundler can find
them. Using a directory named `assets` or `frontend` in your application root directory is a good best practice though.

### Content Negotiation

For resources with different representations and that require truly RESTful content negotiation you can also use
`ctx.respondTo()`.

```js
// GET /hello (Accept: application/json) -> "json"
// GET /hello (Accept: application/xml)  -> "xml"
// GET /hello.json                       -> "json"
// GET /hello.xml                        -> "xml"
await ctx.respondTo({
  json: {json: {hello: 'world'}},
  xml:  {text: '<hello>world</hello>', format: 'xml'}
});
```

The best possible representation will be automatically selected from the `ext` stash value or `Accept` request header.

```js
await ctx.respondTo({
  json: {json: {hello: 'world'}},
  html: async ctx => {
    await ctx.contentFor('header', '<meta name="author" content="sri">');
    await ctx.render({view: 'hello'}, {message: 'world'});
  }
});
```

Functions can be used for representations that are too complex to fit into a single render call.

```js
// GET /hello (Accept: application/json) -> "json"
// GET /hello (Accept: text/html)        -> "html"
// GET /hello (Accept: image/png)        -> "any"
// GET /hello.json                       -> "json"
// GET /hello.html                       -> "html"
// GET /hello.png                        -> "any"
await ctx.respondTo({
  json: {json: {hello: 'world'}},
  html: {template: 'hello'}, {message: 'world'},
  any:  {text: '', status: 204}
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
const formats = ctx.accepts(['html', 'xml']);
if (formats !== null) {
  ...
}
```

For even more advanced negotiation logic you can also use `ctx.accepts()`.

### Exception and Not-Found Pages

By now you've probably already encountered the built-in `404` (Not Found) and `500` (Server Error) pages, that get
rendered automatically when you make a mistake. Those are fallbacks for when your own exception handling fails, which
can be especially helpful during development. You can also render them manually with the helpers `ctx.exception()` and
`ctx.notFound()`.

```js
import mojo from '@mojojs/core';

const app = mojo();

app.get('/divide/:dividend/by/:divisor', async ctx => {
  const params = await ctx.params();
  const dividend = parseInt(params.dividend);
  const divisor = parseInt(params.divisor);

  // 404
  if (isNaN(dividend) || isNaN(divisor)) return ctx.notFound();

  // 500
  if (divisor === 0) return ctx.exception(new Error('Division by zero!'));

  // 200
  return ctx.render({text: `${dividend / divisor}`});
});

app.start();
```

You can also change the templates of those pages, since you most likely want to show your users something more closely
related to your application in production. The renderer will always try to find `exception.${mode}.${format}.*` or
`not_found.${mode}.${format}.*` before falling back to the built-in default templates.

```
%# views/exception.production.html.tmpl
<!DOCTYPE html>
<html>
  <head><title>Server error</title></head>
  <body>
    <h1>Exception</h1>
    <p><%= exception %></p>
    <h1>Stash</h1>
    <pre><%= ctx.inspect(ctx.stash) %></pre>
  </body>
</html>
```

The default exception format is `html`, but that can be changed at application and context level. By default there are
handlers for `html`, `txt` and `json` available.

```js
import mojo from '@mojojs/core';

const app = mojo({exceptionFormat: 'json'});

app.get('/json', ctx => {
  throw new Error('Just a test');
});

app.get('/txt', ctx => {
  ctx.exceptionFormat = 'txt';
  throw new Error('Just a test');
});

app.start();
```

There are also various [exception helpers](Cheatsheet.md#exception-helpers) for you to overload to change the default
behavior.

### Layouts

Most of the time when using `tmpl` templates you will want to wrap your generated content in an HTML skeleton, thanks
to layouts that's absolutely trivial.

```js
import mojo from '@mojojs/core';

const app = mojo();

app.get('/', async ctx => {
  await ctx.render({view: 'foo/bar'});
});

app.start();
```
```
%# views/foo/bar.html.tmpl
% view.layout = 'mylayout';
Hello World!
```
```
%# views/layouts/mylayout.html.tmpl
<!DOCTYPE html>
<html>
  <head><title>MyApp</title></head>
  <body><%== ctx.content.main %></body>
</html>
```

You just select the right layout with `view.layout` and position the rendered content of the main template in the
layout with `ctx.content.main`.

```js
await ctx.render({view: 'mytemplate', layout: 'mylayout'});
```

Instead of using `view.layout` you can also pass the layout directly to `ctx.render()`.

### Partial Views

You can break up bigger templates into smaller, more manageable chunks. These partial views can also be shared with
other templates. Just use `ctx.include()` to include one view into another.

```js
import mojo from '@mojojs/core';

const app = mojo();

app.get('/', async ctx => {
  await ctx.render({view: 'foo/bar'});
});

app.start();
```
```
%# views/foo/bar.html.tmpl
<!DOCTYPE html>
<html>
  %= ctx.include({view: '_header'}, {title: 'Howdy'})
  <body>Bar</body>
</html>
```
```
%# views/_header.html.tmpl
<head><title><%= title %></title></head>
```

You can name partial views however you like, but a leading underscore is a commonly used naming convention.

### Reusable Template Blocks

It's never fun to repeat yourself, that's why you can create reusable template blocks in `tmpl` that work very similar
to normal `async` JavaScript functions, with the `<{blockName}>` and `<{/blockName}>` tags.

```js
import mojo from '@mojojs/core';

const app = mojo();

app.get('/', async ctx => {
  await ctx.render({view: 'welcome'});
});

app.start();
```
```
%# views/welcome.html.tmpl
<{helloBlock(name)}>
  Hello <%= name %>.
<{/helloBlock}>
<%= await helloBlock('Wolfgang') %>
<%= await helloBlock('Baerbel') %>
```

A naive translation of the template to JavaScript code could look like this.

```js
let __output = '';
const helloBlock = async name => {
  let __output = '';
  __output += 'Hello ';
  __output += __escape(name);
  __output += '.\n';
  return new SafeString(__output);
};
__output += __escape(await helloBlock('Wolfgang'));
__output += __escape(await helloBlock('Baerbel'));
return __output;
```

While template blocks cannot be shared between templates, they are most commonly used to pass parts of a template to
helpers.

### Adding Helpers

You should always try to keep your actions small and reuse as much code as possible. Helpers make this very easy, they
get passed the context object as first argument, and you can use them to do pretty much anything an action could do.

```js
import mojo from '@mojojs/core';

const app = mojo();

app.addHelper('debug', (ctx, str) => {
  ctx.app.log.debug(str);
});

app.get('/', async ctx => {
  ctx.debug('Hello from an action!');
  await ctx.render({view: 'index'});
});

app.start();
```
```
%# views/index.html.tmpl
% ctx.debug('Hello from a template!');
```

Helpers can also accept template blocks, this for example, allows pleasant to use tag helpers and filters. Wrapping the
helper result into a `SafeString` object can prevent accidental double escaping.

```js
import mojo, {SafeString} from '@mojojs/core';

const app = mojo();

app.addHelper('trimNewline', async (ctx, block) => {
  const blockResult = await block();
  const trimmedResult = blockRsult.toString().replaceAll('\n', '');
  return new SafeString(trimmedResult);
});

app.get('/', async ctx => {
  await ctx.render({view: 'index'});
});

app.start();
```
```
%# views/index.html.tmpl
<{someBlock}>
  Some text.
  %= 1 + 1
  More text.
<{/someBlock}>
%= await trimNewline(someBlock)
```

You can use a prefix like `cacheControl.*` to organize helpers into namespaces as your application grows. Every prefix
automatically becomes a getter with a proxy object containing the current context object and on which you can call the
nested helpers.

```js
import mojo from '@mojojs/core';

const app = mojo();

app.addHelper('cacheControl.noCaching', ctx => {
  ctx.res.set('Cache-Control', 'private, max-age=0, no-cache');
});
app.addHelper('cacheControl.fiveMinutes', ctx => {
  ctx.res.set('Cache-Control', 'public, max-age=300');
});

app.get('/news', async ctx => {
  ctx.cacheControl.noCaching();
  await ctx.render({text: 'Always up to date.'});
});

app.get('/some_older_story', async ctx => {
  ctx.cacheControl.fiveMinutes();
  await ctx.render({text: 'This one can be cached for a bit.'});
});

app.start();
```

While helpers can also be redefined, this should only be done very carefully to avoid conflicts.

### Content Blocks

The method `ctx.contentFor()` allows you to pass whole blocks of content from one template to another. This can be very
useful when your layout has distinct sections, such as sidebars, where content should be inserted by the template.

```js
import mojo from '@mojojs/core';

const app = mojo();

app.get('/', async ctx => ctx.render({view: 'foo', layout: 'mylayout'}));

app.start();
```
```
%# views/foo.html.tmpl
<{typeBlock}>
  <meta http-equiv="Content-Type" content="text/html">
<{/typeBlock}>
% await ctx.contentFor('header', typeBlock);
<div>Hello World!</div>
<{pragmaBlock}>
  <meta http-equiv="Pragma" content="no-cache">
<{/pragmaBlock}>
% await ctx.contentFor('header', pragmaBlock);
```
```
%# views/layouts/mylayout.html.tmpl
<!DOCTYPE html>
<html>
  <head><%= ctx.content.header %></head>
  <body><%= ctx.content.main %></body>
</html>
```

### Forms

Since most browsers only allow forms to be submitted with `GET` and `POST`, but not request methods like `PUT` or
`DELETE`, they can be spoofed with an `_method` query parameter.

```js
import mojo from '@mojojs/core';

const app = mojo();

app.get('/', ctx => ctx.render({view: 'form'})).name('index');

// PUT  /nothing
// POST /nothing?_method=PUT
app.put('/nothing', async ctx => {
  const params = await ctx.params();
  const value = params.whatever ?? '';
  const flash = await ctx.flash();
  flash.confirmation = `We did nothing with your value (${value}).`;
  await ctx.redirectTo('index');
});

app.start();
```
```
%# views/form.html.tmpl
<!DOCTYPE html>
<html>
  <body>
    % const flash = await ctx.flash();
    % if (flash.confirmation !== null) {
      <p><%= flash.confirmation %></p>
    % }
    <form method="POST" action="<%= ctx.urlFor('nothing', {query: {_method: 'PUT'}}) %>">
      <input type="text" name="whatever" value="I ♥ Mojolicious!" />
      <input type="submit" />
    </form>
  </body>
</html>
```

`ctx.flash()` and `ctx.redirectTo()` are often used together to prevent double form submission, allowing users to
receive a confirmation message that will vanish if they decide to reload the page they've been redirected to.

### Form Validation

To validate GET and POST parameters submitted to your application you can use [JSON Schema](https://json-schema.org/).
Schemas can be registered with a name during application startup via `app.validator.addSchema()`, or ad-hoc via
`ctx.schema()`, which is also be used to retrive named schemas.

```js
import mojo from '@mojojs/core';

const app = mojo();

app.validator.addSchema({
  type: 'object',
  properties: {
    user: {type: 'string', minLength: 1, maxLength: 20},
    pass: {type: 'string', minLength: 1, maxLength: 20}
  },
  required: ['user', 'pass']
}, 'loginForm');

app.get('/', async ctx => {

  // Check if pramameters have been submitted
  const params = await ctx.params();
  if (params.isEmpty === true) return ctx.render({view: 'form'});

  // Validate parameters
  const validate = ctx.schema('loginForm');
  const result = validate(params.toObject());

  // Check if validation failed
  if (result.isValid === false ) return await ctx.render({view: 'form'}, {errors: result.errors});

  // Render confirmation
  await ctx.render({view: 'welcome'});
}).name('index');

app.start();
```
```
%# views/form.html.tmpl
<!DOCTYPE html>
<html>
  <body>
    % if (ctx.stash.errors !== undefined) {
      Errors:
      <ul>
      % for (const error of errors) {
        <li><%= error.instancePath %>: <%= error.message %></li>
      % }
      </ul>
    % }
    <form action="<%= ctx.urlFor('index') %>">
      <label for="user">Username (required, 1-20 characters)</label>
      <br>
      %= await tags.textField('user')
      <br>
      <label for="pass">Password (required, 1-20 characters)</label>
      <br>
      %= await tags.passwordField('pass')
      <br>
      %= await tags.submitButton('Login')
    </form>
  </body>
</html>
```
```
%# views/welcome.html.tmpl
<!DOCTYPE html>
% const params = await ctx.params();
<html><body>Welcome <%= params.get('user') %>.</body></html>
```

Form elements generated with tag helpers will automatically remember their previous values. See the
[Cheatsheet](Cheatsheet.md#view-helpers) for a full list of tag helpers that are currently available by default.

## Advanced

Less commonly used and more powerful features.

### Custom Responses

For dynamic content that does not use the renderer you can use `ctx.res.send` directly.

```js
import mojo from '@mojojs/core';

const app = mojo();

app.get('/', async ctx => {
  ctx.res.statusCode = 200;
  ctx.res.set('Content-Type', 'text/plain');
  await ctx.res.send('Hello World!');
});

app.start();
```

This also works for readable streams.

```js
import mojo from '@mojojs/core';
import Path from '@mojojs/path';

const app = mojo();

app.get('/', async ctx => {
  const readable = new Path('/etc/passwd').createReadStream();
  ctx.res.set('Content-Type', 'text/plain');
  await ctx.res.send(readable);
});

app.start();
```

### Helper Plugins

Some helpers might be useful enough for you to share them between multiple applications, plugins make that very simple.

```js
export default function cachingHelperPlugin (app) {
  app.addHelper('noCaching', ctx => {
    ctx.res.set('Cache-Control', 'private, max-age=0, no-cache');
  });
  app.addHelper('fiveMinutesCaching', ctx => {
    ctx.res.set('Cache-Control', 'public, max-age=300');
  });
}
```

The exported plugin function will be called by the [mojo.js](https://mojojs.org) application during startup and may
contain any code that could also appear in the main application script itself.

```js
import mojo from '@mojojs/core';
import cachingHelperPlugin from './plugin.js';

const app = mojo();
app.plugin(cachingHelperPlugin);

app.get('/', async ctx => {
  ctx.fiveMinutesCaching();
  await ctx.render({text: 'Hello Caching!'});
});

app.start();
```

A skeleton for a full [npm](https://npmjs.org) compatible plugin can also be generated with the command
`npm create @mojojs/plugin`. We recommend the use of a `mojo-plugin-*` naming prefix to make the package easier to
identify.

```
$ mkdir mojo-plugin-caching-helpers
$ cd mojo-plugin-caching-helpers
$ npm create @mojojs/plugin -- mojo-plugin-caching-helpers
$ npm install
```

You can also use the `--ts` flag to generate TypeScript instead of JavaScript code.

```
$ npm create @mojojs/plugin -- --ts mojo-plugin-caching-helpers
```

The generated test file `test/basic.js` uses [tap](https://www.npmjs.com/package/tap) by default and contains enough
integration tests to get you started in no time.

```
$ npm install
$ npm run test
```

Once you are happy with your plugin you can share it with the community, all you need is an [npm](https://npmjs.org)
account. Don't forget to update the metadata in your `package.json` file.

```
$ npm version major
$ npm publish
```

See [mojo-plugin-ejs](https://github.com/mojolicious/mojo-plugin-ejs) and
[mojo-plugin-nunjucks](https://github.com/mojolicious/mojo-plugin-nunjucks) for full example plugins you can fork. And
if you're writing your plugin in TypeScript, make sure to use
[declaration merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html) to add your helpers to the
`MojoContext` interface.

```
declare module '@mojojs/core' {
  interface MojoContext {
    noCaching: () => void;
    fiveMinutesCaching: (): void;
  }
}
```

### Chunked Transfer Encoding

For very dynamic content you might not know the response content length in advance, that's where the chunked transfer
encoding comes in handy.

```js
import mojo from '@mojojs/core';
import {Stream} from 'node:stream';

const app = mojo();

app.get('/', async ctx => {
  ctx.res.set('Transfer-Encoding', 'chunked');
  const stream = Stream.Readable.from(['Hello', 'World!']);
  await ctx.res.send(stream);
});

app.start();
```

Just set the `Transfer-Encoding` header to `chunked` and send the response content in chunks via `Readable` stream.

```
HTTP/1.1 200 OK
Transfer-Encoding: chunked
Date: Sun, 24 Apr 2022 02:43:21 GMT
Connection: close

5
Hello
6
World!
0
```

### Adding Your Favorite Template System

Maybe you would prefer a different template system than
[@mojojs/template](https://www.npmjs.com/package/@mojojs/template), which is included with
[mojo.js](https://mojojs.org) under the name `tmpl`, and there is not already a plugin on npm for your favorite one.
All you have to do, is to add a new template engine with `renderer.addEngine()` from your own plugin.

```js
// my-engine.js
export default function myEnginePlugin (app) {
  app.renderer.addEngine('mine', {
    async render(ctx, options) {

      // Check for one-time use inline template
      const inline = options.inline;

      // Check for appropriate template in "views" directories
      const viewPath = options.viewPath;

      // This part is up to you and your template system :)
      ...

      // Pass the rendered result back to the renderer as a `Buffer` object
      return Buffer.from('Hello World!');

      // Or just throw and exception if an error occurs
      throw new Error('Something went wrong with the template');
    }
  });
}
```

An inline template, if provided by the user, will be passed along with the options.

```js
// myapp.js
import mojo from '@mojojs/core';
import myEnginePlugin from './my-engine.js';

const app = mojo();
app.plugin(myEnginePlugin);

// Render an inline template
app.get('/inline', async ctx => {
  await ctx.render({inline: '...', engine: 'mine'});
});

// Render template file "views/test.html.mine"
app.get('/template', async ctx => {
  await ctx.render({view: 'test'});
});

app.start();
```

See [mojo-plugin-ejs](https://github.com/mojolicious/mojo-plugin-ejs) and
[mojo-plugin-nunjucks](https://github.com/mojolicious/mojo-plugin-nunjucks) for full example plugins you can fork.

## More

A lot more documentation and examples by many different authors can be found in the
[mojo.js wiki](https://github.com/mojolicious/mojo.js/wiki).

## Support

If you have any questions the documentation might not yet answer, don't hesitate to ask in the
[Forum](https://github.com/mojolicious/mojo.js/discussions), or on [IRC](https://web.libera.chat/#mojo).
