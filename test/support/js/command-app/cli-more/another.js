export default async function testCommand(app, args) {
  process.stdout.write(`Test ${args[1]}!`);
}

testCommand.description = 'Another test description';
testCommand.usage = 'Another test usage';
