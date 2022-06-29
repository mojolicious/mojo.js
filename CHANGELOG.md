
# Changelog

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

First major release. This package strictly follows [Semantic Versioning](https://semver.org).
