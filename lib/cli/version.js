'use strict';

const util = require('../util');

function version () {
  const mojoVersion = require('../mojo').version;
  const table = [['node', `(${process.version}, ${process.platform})`], ['mojo.js', `(${mojoVersion})`]];
  process.stdout.write(util.tablify(table));
}
version.description = 'Show version';
version.usage = `Usage: APPLICATION version [OPTIONS]

  ./myapp.js version

Options:
  -h, --help   Show this summary of available options
`;

module.exports = version;
