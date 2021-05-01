export default class FooController {
  anotherView (ctx) {
    ctx.render({view: 'foo'});
  }

  withInlineView (ctx) {
    ctx.render({inline: 'Hello <%= name %>'});
  }

  withView (ctx) {
    ctx.render({view: 'foo/hello'});
  }

  works (ctx) {
    ctx.render({text: 'Action works!'});
  }
}
