'use strict';

const util = require('../util');

function versionCommand () {
  const mojoVersion = require('../mojo').version;
  const table = [['node', `(${process.version}, ${process.platform})`], ['mojo.js', `(${mojoVersion})`]];
  process.stdout.write(util.tablify(table));
}
versionCommand.description = 'Show version';
versionCommand.usage = `Usage: APPLICATION version [OPTIONS]

  ./myapp.js version

Options:
  -h, --help   Show this summary of available options
`;

module.exports = versionCommand;
