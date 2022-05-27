import type {MojoApp} from '../types.js';
import {CGI} from '../cgi.js';

/**
 * CGI command.
 */
export default async function cgiCommand(app: MojoApp): Promise<void> {
  await new CGI(app).run();
}

cgiCommand.description = 'Start application with CGI';
cgiCommand.usage = `Usage: APPLICATION cgi [OPTIONS]

  node index.js cgi

Options:
  -h, --help   Show this summary of available options
`;
