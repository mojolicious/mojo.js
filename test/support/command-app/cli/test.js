'use strict';

async function testCommand (app, args) {
  return `Test ${args[1]}!`;
}

testCommand.description = 'Test description';
testCommand.usage = 'Test usage';

module.exports = testCommand;
