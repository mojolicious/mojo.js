import t from 'tap';
import Logger from '../lib/logger.js';
import {sleep} from '../lib/util.js';
import {tempDir} from '../lib/file.js';

t.test('Logger', async t => {
  const dir = await tempDir();

  t.test('Logging to file', async t => {
    const file = dir.child('file.log');
    const stream = (await file.touch()).createWriteStream();
    const logger = new Logger({destination: stream, level: 'error'});
    t.same(logger.destination, stream);
    logger.error('Works');
    logger.error('Works', 'too');
    logger.fatal('I ♥ Mojolicious');
    logger.error(() => 'This too');
    logger.trace('Not this');
    logger.debug(() => 'This not');
    while (stream.writableLength) {
      await sleep(10);
    }
    let content = await file.readFile('utf8');
    t.match(content, /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\] \[error\] Works\n/);
    t.match(content, /\[.+\] \[error\] Works too\n/);
    t.match(content, /\[.+\] \[fatal\] I ♥ Mojolicious\n/);
    t.match(content, /\[.+\] \[error\] This too\n/);
    t.notMatch(content, /\[.+\] \[trace\] Not this\n/);
    t.notMatch(content, /\[.+\] \[debug\] This not\n/);

    logger.level = 'trace';
    logger.trace('Now this');
    logger.debug(() => 'And this');
    while (stream.writableLength) {
      await sleep(10);
    }
    content = await file.readFile('utf8');
    t.match(content, /\[.+\] \[trace\] Now this\n/);
    t.match(content, /\[.+\] \[debug\] And this\n/);
  });

  t.test('Logging to STDERR', async t => {
    const logger = new Logger();
    t.same(logger.destination, process.stderr);
  });

  t.test('trace', async t => {
    const file = dir.child('trace.log');
    const stream = (await file.touch()).createWriteStream();
    const logger = new Logger({destination: stream, level: 'trace'});
    logger.trace('One');
    logger.debug('Two');
    logger.info('Three');
    logger.warn('Four');
    logger.error('Five');
    logger.fatal('Six');
    while (stream.writableLength) {
      await sleep(10);
    }
    const content = await file.readFile('utf8');
    t.match(content, /\[.+\] \[trace\] One\n/);
    t.match(content, /\[.+\] \[debug\] Two\n/);
    t.match(content, /\[.+\] \[info\] Three\n/);
    t.match(content, /\[.+\] \[warn\] Four\n/);
    t.match(content, /\[.+\] \[error\] Five\n/);
    t.match(content, /\[.+\] \[fatal\] Six\n/);
  });

  t.test('debug', async t => {
    const file = dir.child('debug.log');
    const stream = (await file.touch()).createWriteStream();
    const logger = new Logger({destination: stream, level: 'debug'});
    logger.trace('One');
    logger.debug('Two');
    logger.info('Three');
    logger.warn('Four');
    logger.error('Five');
    logger.fatal('Six');
    while (stream.writableLength) {
      await sleep(10);
    }
    const content = await file.readFile('utf8');
    t.notMatch(content, /\[.+\] \[trace\] One\n/);
    t.match(content, /\[.+\] \[debug\] Two\n/);
    t.match(content, /\[.+\] \[info\] Three\n/);
    t.match(content, /\[.+\] \[warn\] Four\n/);
    t.match(content, /\[.+\] \[error\] Five\n/);
    t.match(content, /\[.+\] \[fatal\] Six\n/);
  });

  t.test('info', async t => {
    const file = dir.child('info.log');
    const stream = (await file.touch()).createWriteStream();
    const logger = new Logger({destination: stream, level: 'info'});
    logger.trace('One');
    logger.debug('Two');
    logger.info('Three');
    logger.warn('Four');
    logger.error('Five');
    logger.fatal('Six');
    while (stream.writableLength) {
      await sleep(10);
    }
    const content = await file.readFile('utf8');
    t.notMatch(content, /\[.+\] \[trace\] One\n/);
    t.notMatch(content, /\[.+\] \[debug\] Two\n/);
    t.match(content, /\[.+\] \[info\] Three\n/);
    t.match(content, /\[.+\] \[warn\] Four\n/);
    t.match(content, /\[.+\] \[error\] Five\n/);
    t.match(content, /\[.+\] \[fatal\] Six\n/);
  });

  t.test('warn', async t => {
    const file = dir.child('warn.log');
    const stream = (await file.touch()).createWriteStream();
    const logger = new Logger({destination: stream, level: 'warn'});
    logger.trace('One');
    logger.debug('Two');
    logger.info('Three');
    logger.warn('Four');
    logger.error('Five');
    logger.fatal('Six');
    while (stream.writableLength) {
      await sleep(10);
    }
    const content = await file.readFile('utf8');
    t.notMatch(content, /\[.+\] \[trace\] One\n/);
    t.notMatch(content, /\[.+\] \[debug\] Two\n/);
    t.notMatch(content, /\[.+\] \[info\] Three\n/);
    t.match(content, /\[.+\] \[warn\] Four\n/);
    t.match(content, /\[.+\] \[error\] Five\n/);
    t.match(content, /\[.+\] \[fatal\] Six\n/);
  });

  t.test('error', async t => {
    const file = dir.child('error.log');
    const stream = (await file.touch()).createWriteStream();
    const logger = new Logger({destination: stream, level: 'error'});
    logger.trace('One');
    logger.debug('Two');
    logger.info('Three');
    logger.warn('Four');
    logger.error('Five');
    logger.fatal('Six');
    while (stream.writableLength) {
      await sleep(10);
    }
    const content = await file.readFile('utf8');
    t.notMatch(content, /\[.+\] \[trace\] One\n/);
    t.notMatch(content, /\[.+\] \[debug\] Two\n/);
    t.notMatch(content, /\[.+\] \[info\] Three\n/);
    t.notMatch(content, /\[.+\] \[warn\] Four\n/);
    t.match(content, /\[.+\] \[error\] Five\n/);
    t.match(content, /\[.+\] \[fatal\] Six\n/);
  });

  t.test('fatal', async t => {
    const file = dir.child('fatal.log');
    const stream = (await file.touch()).createWriteStream();
    const logger = new Logger({destination: stream, level: 'fatal'});
    logger.trace('One');
    logger.debug('Two');
    logger.info('Three');
    logger.warn('Four');
    logger.error('Five');
    logger.fatal('Six');
    while (stream.writableLength) {
      await sleep(10);
    }
    const content = await file.readFile('utf8');
    t.notMatch(content, /\[.+\] \[trace\] One\n/);
    t.notMatch(content, /\[.+\] \[debug\] Two\n/);
    t.notMatch(content, /\[.+\] \[info\] Three\n/);
    t.notMatch(content, /\[.+\] \[warn\] Four\n/);
    t.notMatch(content, /\[.+\] \[error\] Five\n/);
    t.match(content, /\[.+\] \[fatal\] Six\n/);
  });

  t.test('Child logger', async t => {
    const file = dir.child('child.log');
    const stream = (await file.touch()).createWriteStream();
    const logger = new Logger({destination: stream, level: 'trace'});
    const child = logger.child('[123]');
    child.trace('One');
    child.debug('Two');
    child.info('Three');
    child.warn('Four');
    child.error('Five');
    logger.info('No prefix');
    child.fatal('Six');
    while (stream.writableLength) {
      await sleep(10);
    }
    const content = await file.readFile('utf8');
    t.match(content, /\[.+\] \[trace\] \[123\] One\n/);
    t.match(content, /\[.+\] \[debug\] \[123\] Two\n/);
    t.match(content, /\[.+\] \[info\] \[123\] Three\n/);
    t.match(content, /\[.+\] \[warn\] \[123\] Four\n/);
    t.match(content, /\[.+\] \[error\] \[123\] Five\n/);
    t.match(content, /\[.+\] \[fatal\] \[123\] Six\n/);
    t.match(content, /\[.+\] \[info\] No prefix\n/);
  });
});
