import type {MojoContext} from '../../../../../lib/core.js';

export default class FooController {
  async hello (ctx: MojoContext): Promise<void> {
    const what: string = await ctx.testHelper();
    await ctx.render({text: `Hello ${what}!`});
  }
}
