
# Documentation

The [mojo.js](https://mojojs.org) documentation is structured into two parts, the tutorial everyone starts with, and
multiple guides that explain all major features in detail.

Some parts of the documentation only use simplified single file web applications for examples, but that's merely a
convenience for the reader. Almost all features are exactly the same for full well-structured
[mojo.js](https://mojojs.org) applications.

### Basics

* Learning Web Technologies

  All web development starts with HTML, CSS and JavaScript, to learn the basics we recommend the
  [Mozilla Developer Network](https://developer.mozilla.org/en-US/docs/Web). And if you want to know more about how
  browsers and web servers actually communicate, there's also a very nice introduction to
  [HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP).

### Conventions

* Variable names

  For brevity and clarity, example variables will reflect the type of data the API uses. For instance, `ctx` to denote
  a [Context](Cheatsheet.md#context) object, and `app` to denote the [App](Cheatsheet.md#app) object.

### Tutorial

* [Introduction](Introduction.md)

  A quick example driven introduction to the basic concepts of [mojo.js](https://mojojs.org).

### Guides

* [Growing](Growing.md)

  Starting a single file prototype from scratch and growing it into a well-structured [mojo.js](https://mojojs.org)
  application.

* [Routing](Routing.md)

  A more detailed introduction to the [mojo.js](https://mojojs.org) router.

* [Rendering](Rendering.md)

  Generating content with the [mojo.js](https://mojojs.org) renderer.

* [User-Agent](User-Agent.md)

  How to use the full featured HTTP and WebSocket user-agent that ships with the [mojo.js](https://mojojs.org)
  framework.

* [Cookbook](Cookbook.md)

  Cooking with [mojo.js](https://mojojs.org), recipes for every taste.

* [Contributing](Contributing.md)

  Become a part of the ongoing [mojo.js](https://mojojs.org) development.

* [FAQ](FAQ.md)

  Answers to the most frequently asked questions.

### Reference

* [Cheatsheet](Cheatsheet.md)

  An overview of the most commonly encountered [mojo.js](https://mojojs.org) classes, helpers and hooks.

* [API](https://mojojs.org/api)

  This is the class hierarchy of [mojo.js](https://mojojs.org), listing all available methods and properties.

### Spin-offs

These modules are not part of [@mojojs/core](https://www.npmjs.com/package/@mojojs/core) itself, but have been designed
to be used with it and are being developed under the same umbrella.

* [@mojojs/dom](https://www.npmjs.com/package/@mojojs/dom)

  A fast and minimalistic HTML/XML DOM parser with CSS selectors.

* [@mojojs/path](https://www.npmjs.com/package/@mojojs/path)

  A convenient container class for file system paths.

* [@mojojs/pg](https://www.npmjs.com/package/@mojojs/pg)

  A tiny wrapper around [pg](https://www.npmjs.com/package/pg) that makes [PostgreSQL](http://www.postgresql.org/) a
  lot of fun to use.

  **Examples:** A the well-structured [blog](https://github.com/mojolicious/pg.js/tree/main/examples/blog) application
  that will show you how to apply the MVC design pattern in practice.

* [@mojojs/template](https://www.npmjs.com/package/@mojojs/template)

  A very fast embedded JavaScript template engine.

## More

A lot more documentation and examples by many different authors can be found in the
[mojo.js wiki](https://github.com/mojolicious/mojo.js/wiki).

## Support

If you have any questions the documentation might not yet answer, don't hesitate to ask in the
[Forum](https://github.com/mojolicious/mojo.js/discussions), or on [IRC](https://web.libera.chat/#mojo).
