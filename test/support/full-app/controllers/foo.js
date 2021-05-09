export default class FooController {
  anotherView (ctx) {
    const role = ctx.models.users.getRole('sri');
    ctx.render({view: 'foo'}, {role});
  }

  withInlineView (ctx) {
    ctx.render({inline: 'Hello <%= name %>'});
  }

  withView (ctx) {
    ctx.render('foo/hello');
  }

  works (ctx) {
    ctx.render({text: 'Action works!'});
  }
}
