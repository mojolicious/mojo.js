export default class FooController {
  anotherView(ctx) {
    const role = ctx.models.users.getRole('sri');
    return ctx.render({view: 'foo'}, {role});
  }

  withInlineView(ctx) {
    return ctx.render({inline: 'Hello <%= name %>'});
  }

  withView(ctx) {
    if (ctx.stash.layout !== undefined) return ctx.render({view: 'foo/hello', layout: ctx.stash.layout});
    return ctx.render({view: 'foo/hello'});
  }

  works(ctx) {
    return ctx.render({text: 'Action works!'});
  }

  defaultView(ctx) {
    return ctx.render();
  }

  async variants(ctx) {
    const params = await ctx.params();
    const variant = params.get('device');
    await ctx.render({view: 'variants', layout: 'variants', variant});
  }

  async websocket(ctx) {
    ctx.json(async ws => {
      for await (const message of ws) {
        message.hello = message.hello + '!';
        ws.send(message);
      }
    });
  }

  async hooks(ctx) {
    await ctx.render({json: ctx.app.config.hooksCalled});
  }
}
