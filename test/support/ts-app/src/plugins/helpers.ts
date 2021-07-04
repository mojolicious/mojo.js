import type {MojoApp, MojoContext} from '../../../../../lib/types.js';

export default function helpersPlugin (app: MojoApp): void {
  app.addHelper('testHelper', async (ctx: MojoContext, partial: string): Promise<string> => {
    return `TypeScript ${partial}`;
  });
}
