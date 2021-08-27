export default async function testCommand(app, args) {
  process.stdout.write(`Test ${args[1]}!`);
}

testCommand.description = 'Test description';
testCommand.usage = 'Test usage';
