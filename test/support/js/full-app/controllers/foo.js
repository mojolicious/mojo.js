export default class FooController {
  anotherView(ctx) {
    const role = ctx.models.users.getRole('sri');
    return ctx.render({view: 'foo'}, {role});
  }

  withInlineView(ctx) {
    return ctx.render({inline: 'Hello <%= name %>'});
  }

  withView(ctx) {
    return ctx.render('foo/hello');
  }

  works(ctx) {
    return ctx.render({text: 'Action works!'});
  }

  defaultView(ctx) {
    return ctx.render();
  }
}
