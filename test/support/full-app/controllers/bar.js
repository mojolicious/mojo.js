'use strict';

class Controller {
  hello (ctx) {
    return ctx.render({text: ctx.stash.msg});
  }

  async jsonReturn (ctx) {
    const data = await ctx.req.json();
    return ctx.render({json: data});
  }
}

module.exports = Controller;
