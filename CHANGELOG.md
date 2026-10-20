
# Changelog

This package strictly follows [Semantic Versioning](https://semver.org).

## v2.0.0 (2026-10-20)

### Breaking Changes

  * Removed support for Node.js versions older than 22.18.
  * Replaced `nopt` with `util.parseArgs` for all built-in commands, option abbreviations like `--verb` for `--verbose`
    are no longer supported, and unknown options as well as invalid numbers are now an error.
  * TypeScript applications generated with `create-full-app --ts` now run without a build step, the `build`,
    `build:test` and `build:watch` scripts have been replaced with a `check` script.
  * TypeScript plugins generated with `create-plugin --ts` now run their tests without a build step, the `build:test`
    and `build:watch` scripts have been replaced with a `prepublishOnly` script.
  * Removed `chalk`, `form-data` and `nopt` dependencies.
  * Request bodies are now limited to 16 MiB by default (after decompression), larger requests get a `413` response.
  * WebSocket messages are now limited to 256 KiB by default, larger messages close the connection with status `1009`.
  * Static file `ETag` values now consist of modification time and size, instead of an MD5 hash of the modification
    time.
  * `Range` requests for the last bytes of a file (`bytes=-500`) now follow RFC 9110 and return the last bytes,
    instead of the first.
  * `ctx.req.form()` and `ctx.req.files()` now throw an exception if the request body has already been consumed,
    instead of returning no values.

### Features

  * Added support for loading controllers and commands written in TypeScript with Node.js type stripping.
  * Added `Content-Length` header to multipart `formData` requests made with `UserAgent`.
  * Added `maxRequestSize` property to `App`.
  * Added `maxMessageSize` property to `Body` and `ServerRequest`.
  * Added `maxWebSocketSize` option and property to `Server`.
  * Added `--max-websocket-size` option to `server` command.
  * Added `util.HTTPError` class, for exceptions that `ctx.httpException()` renders with their HTTP status, client
    errors are only logged at `debug` level.
  * Added support for `Content-Encoding: gzip` to `ctx.req.files()` and `ctx.req.form()`.

### Bug Fixes

  * Fixed a bug where `ctx.req.files()` always returned `undefined` for the `encoding` and `mimetype` of uploads.
  * Fixed a bug where TypeScript applications needed to install `@types/ws` and `@types/stack-utils` themselves.
  * Fixed a bug where plugins generated with `create-plugin` had an `exports` path that did not exist.
  * Fixed a bug where TypeScript plugins generated with `create-plugin --ts` could not be built with TypeScript 6.
  * Fixed a bug where an error in a response stream could crash the whole server.
  * Fixed a bug where aborted downloads of static files would leak file descriptors.
  * Fixed a bug where session cookies made the server derive the encryption key with `scrypt` for every request.
  * Fixed a bug where `Range` requests past the end of a file would get a response with the wrong `Content-Length`.
  * Fixed a bug where `UserAgent` would send `authorization` and `cookie` headers in lower case to other hosts after
    redirects.
  * Fixed a bug where `UserAgent` would send the `auth` option to other hosts after `307` and `308` redirects.
  * Fixed a bug where `UserAgent` would modify the options passed to request methods.
  * Fixed a bug where the TypeScript types of `UserAgent` request methods required an `options` argument.
  * Fixed a bug where request headers like `constructor` and `__proto__` would result in a `500` response.
  * Fixed a bug where `If-Modified-Since` request headers would never result in a `304` response.
  * Fixed a bug where `app.warmup()` was called once for every listen location.
  * Fixed a bug where responses with invalid headers or status codes would leave the client waiting forever.
  * Fixed a bug where weak `ETag` values and `If-None-Match` lists without spaces would never result in a `304`
    response.
  * Fixed a bug where `MOJO_SERVER_DEBUG` and `MOJO_CLIENT_DEBUG` could make keep-alive connections hang.
  * Fixed a bug where the `get` command used colors on `stderr` based on `stdout`.
  * Fixed test coverage reports, which were incorrect because of the TypeScript loader used by `tap`.
  * Fixed test failures on Windows caused by line ending conversion of test files.
  * Added a CI job that tests the published package with JavaScript and TypeScript applications.

## v1.27.0 (2026-10-19)

### Features

  * Added support for the `QUERY` HTTP request method from RFC 10008.
  * Added `query` methods to `App`, `Route` and `UserAgent`.
  * Added `queryOk` method to `TestUserAgent`.
  * Added EXPERIMENTAL support for partitioned cookies.
  * Added EXPERIMENTAL `partitioned` option to `ctx.res.setCookie()` and `partitioned` property to `Session`.
  * Added EXPERIMENTAL support for Server-Sent Events.
  * Added EXPERIMENTAL `buildEvent` and `parseEvent` functions.
  * Added EXPERIMENTAL `ctx.writeSSE()` and `ctx.finishSSE()` methods.
  * Added EXPERIMENTAL `sse` method to `UserAgentResponse`.
  * Added EXPERIMENTAL `getSSEOk`, `postSSEOk`, `sseFinishOk`, `sseFinishedOk`, `sseOk`, `sseIdIs`, `sseIdIsnt`,
    `sseTextIs`, `sseTextIsnt`, `sseTextLike`, `sseTextUnlike`, `sseTypeIs` and `sseTypeIsnt` methods to
    `TestUserAgent`.

### Bug Fixes

  * Fixed a bug where the `SCRIPT_NAME` prefix was sometimes incorrectly removed from `PATH_INFO` in CGI environments.
  * Fixed a bug where the `finish` event was not emitted for the context object when a connection was closed early.

## v1.26.12 (2025-12-19)

### Bug Fixes

  * Fixed startup exit codes. ([@dmanto](https://github.com/dmanto))

## v1.26.10 (2025-02-05)

### Bug Fixes

  * Fixed `MojoModels` to be an interface instead of type. ([@dmanto](https://github.com/dmanto))

## v1.26.8 (2024-11-18)

### Bug Fixes

  * Fixed compatibility with `node:assert/strict`. ([@dmanto](https://github.com/dmanto))

## v1.26.4 (2024-02-26)

### Bug Fixes

  * Fixed security issue that might allow for session data to be forged.

## v1.26.0 (2023-11-09)

### Features

  * Added support for `await using` with TypeScript to `UserAgent`, `MockUserAgent` and `TestUserAgent` classes.

## v1.25.6 (2023-10-05)

### Bug Fixes

  * Fixed a bug where the static file server would use the response code 200 instead of 206 for partial responses.
    ([@dmanto](https://github.com/dmanto))

## v1.25.3 (2023-07-15)

### Bug Fixes

  * Fixed a bug where `ctx.urlFor()` would not work properly for `/` routes. ([@dmanto](https://github.com/dmanto))

## v1.25.0 (2023-06-21)

### Features

  * Added support for nested helpers. ([@dmanto](https://github.com/dmanto))
  * Added a `tags` namespace for all tag helpers. That means `ctx.styleTag()` becomes `ctx.tags.style()` (everywhere)
    or `tags.style()` (in templates only).

## v1.24.6 (2023-06-19)

## Bug Fixes

  * Fixed built-in templates to not require an internet connection. ([@hernan604](https://github.com/hernan604))

## v1.24.0 (2023-03-17)

### Features

  * Added timeout support for `UserAgent` requests.
  * Added `fragment` option to `ctx.urlFor()` and related methods.

## v1.23.2 (2023-03-11)

### Bug Fixes

  * Fixed compression bug in proxy helpers.

## v1.23.1 (2023-03-10)

### Bug Fixes

  * Fixed support for multiple views in different formats sharing the same name.

## v1.23.0 (2023-02-26)

### Features

  * Added `proxyGet`, `proxyPost` and `proxyRequest` proxy helpers.

## v1.22.0 (2023-02-23)

### Features

  * Added `render:before` hook.

## v1.21.0 (2023-02-18)

### Features

  * Added support for `async` functions to be passed to `ctx.contentFor()` and tag helpers.

### Bug Fixes

  * Fixed bug where `ctx.contentFor()` would not `await` promises.
  * Fixed various promise related inconsistencies in tag helpers.

## v1.20.0 (2023-02-16)

### Features

  * Added `onStart` and `onStop` methods to `App` class.

## v1.19.0 (2023-02-13)

### Features

  * Added support for backend specific extensions, such as common Node.js middleware frameworks.
  * Added `backend` property to `Context` class.

## v1.18.0 (2023-02-08)

### Features

  * Added `command:init` hook.

## v1.17.0 (2023-02-03)

### Features

  * Added `textUnlike` method to `TestUserAgent` class.

## v1.16.0 (2023-02-03)

### Features

  * Added `removeEmpty` method to `Params` class.
  * Added `notEmpty` option to `params` method in `Context` class.

## v1.15.0 (2023-02-03)

### Features

  * Added support for multiple query parameters sharing the same name to `urlFor` method in `Context` class.

## v1.14.6 (2023-02-01)

### Bug Fixes

  * Fixed a bug where the `app:start` hook could not add new command paths.

## v1.14.0 (2022-12-11)

### Features

  * Added support for extending the user-agent with async hooks.
  * Added `hooks` property and `addHook` method to `UserAgent` class.

## v1.13.0 (2022-11-25)

### Features

  * Added support for parsing and generating `Link` headers.
  * Added `getLinks` and `setLinks` methods to `Headers` class.

## v1.12.0 (2022-11-20)

### Features

  * Added `clone`, `dehop` and `remove` methods to `Headers` class.

## v1.11.0 (2022-11-11)

### Features

  * Added `labelFor` helper.
  * Added `MojoRenderOptions` and `MojoURLOptions` to exported types for use in plugins.
  * Improved `ctx.urlFor()` and `ctx.urlWith()` to throw an exception for missing routes.

## v1.10.0 (2022-11-07)

### Features

  * Added TypeScript support to `create-plugin` command (with `--ts` option).

## v1.9.0 (2022-11-01)

### Features

  * Added `examples/chat.js` WebSocket chat example application.
  * Added `monthFieldTag`, `numberFieldTag`, `rangeFieldTag`, `telFieldTag`, `timeFieldTag`, `urlFieldTag` and
    `weekFieldTag` helpers.

## v1.8.0 (2022-10-22)

### Features

  * Added `isEmpty` getter to `Params` class.
  * Added `colorFieldTag`, `dateFielTag`, `datetimeFieldTag`, `emailFieldTag`, `fileFieldTag`, `hiddenFieldTag`,
    `searchFieldTag` and `passwordFieldTag` helpers.

## v1.7.0 (2022-10-14)

### Features

  * Added `build:watch` script to `package.json` files generated by the `create-full-app` command.

## v1.6.0 (2022-10-03)

### Features

  * Added `dev` and `start` scripts to `package.json` files generated by the `create-full-app` command.

## v1.5.0 (2022-09-08)

### Features

  * Added support for static assets.
  * Added `urlForAsset` method to `Context` class.
  * Added `assetDir` property and `assetPath` method to `Static` class.
  * Added `assetTag` helper.
  * Added tag attributes to `scriptTag` and `styleTag` helpers.

## v1.4.0 (2022-08-15)

### Features

  * Added support for embedding mojo.js applications with `mountPlugin`.
  * Added support for rewriting `ctx.req.path`.
  * Added support for relative paths with `ctx.req.basePath` to `ctx.urlFor`.
  * Added `app:warmup` application hook.

### Bug Fixes

  * Fixed a bug where trying to consume a request body more than once would not result in an exception.
    ([@marcusramberg](https://github.com/marcusramberg))
  * Fixed types to allow for generics to be used with forms, like `const {foo, bar} = form.toObject<MyData>()`.

## v1.3.1 (2022-08-13)

### Bug Fixes

  * Fixed types to allow for generics to be used with JSON, like `const {foo, bar} = await ctx.req.json<MyData>()`.

## v1.3.0 (2022-08-03)

### Features

  * Added support for hiding developer commands from the command list (can be included again with the `--show-all`
    option).

### Bug Fixes

  * Fixed `app.validator.schema()` to throw an exception for invalid schemas.
    ([@carragom](https://github.com/carragom))

## v1.2.0 (2022-07-16)

### Features

  * Added support for intercepting the command line interface with the `command:before` hook.

## v1.1.2 (2022-06-30)

### Bug Fixes

  * Fixed a bug where the `app:stop` hook was triggered too early with the server command.

## v1.1.1 (2022-06-29)

### Bug Fixes

  * Fixed a bug where `TestUserAgent` would not reset the DOM cache in between requests.

## v1.1.0 (2022-06-29)

### Features

  * Added UNIX domain socket support for user-agent and server (HTTP and WebSocket).
  * Added `app:start` and `app:stop` application hooks.
  * Added `suggestedMethod` method to `Route` class.
  * Added `buttonTo`, `checkBoxTag`, `formFor`, `inputTag`, `radioButtonTag`, `submitButtonTag`, `textAreaTag` and
    `textFieldTag` helpers.
  * Added support for `urlFor` options to `linkTo` helper.

## v1.0.0 (2022-06-20)

First major release.
