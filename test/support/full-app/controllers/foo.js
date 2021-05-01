export default class FooController {
  anotherView (ctx) {
    const role = ctx.models.users.getRole('sri');
    ctx.render({view: 'foo', role: role});
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
