export default class FooController {
  withTemplate (ctx) {
    ctx.render({template: 'foo/hello'});
  }

  works (ctx) {
    ctx.render({text: 'Action works!'});
  }
}
