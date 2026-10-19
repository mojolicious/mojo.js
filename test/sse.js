import {buildEvent, parseEvent} from '../lib/sse.js';
import t from 'tap';

t.test('SSE', async t => {
  await t.test('Simple event roundtrip', async t => {
    const bytes = buildEvent({type: 'foo', text: 'bar', id: 23});
    t.equal(bytes.toString(), 'event: foo\r\ndata: bar\r\nid: 23\r\n\r\n');
    const [event, buffer] = parseEvent(bytes.toString());
    t.same(event, {id: '23', type: 'foo', text: 'bar'});
    t.equal(buffer, '');
  });

  await t.test('No id and type', async t => {
    const bytes = buildEvent({text: 'bar'});
    t.equal(bytes.toString(), 'data: bar\r\n\r\n');
    t.same(parseEvent(bytes.toString())[0], {id: null, type: 'message', text: 'bar'});
  });

  await t.test('Unicode roundtrip', async t => {
    const bytes = buildEvent({type: 'fo♥o', text: 'I ♥ Mojolicious', id: '1♥3'});
    t.same(parseEvent(bytes.toString())[0], {id: '1♥3', type: 'fo♥o', text: 'I ♥ Mojolicious'});
  });

  await t.test('Event with multiple data sections', async t => {
    t.same(parseEvent('data: YHOO\r\ndata: +2\r\ndata: 10\r\n\r\n')[0], {
      id: null,
      type: 'message',
      text: 'YHOO\n+2\n10'
    });
  });

  await t.test('Multiple lines', async t => {
    let buffer =
      'data: This is the first message.\n\ndata: This is the second message, it\n' +
      'data: has two lines.\n\ndata: This is the third message.\n\n';
    let event;
    [event, buffer] = parseEvent(buffer);
    t.same(event, {id: null, type: 'message', text: 'This is the first message.'});
    [event, buffer] = parseEvent(buffer);
    t.same(event, {id: null, type: 'message', text: 'This is the second message, it\nhas two lines.'});
    [event, buffer] = parseEvent(buffer);
    t.same(event, {id: null, type: 'message', text: 'This is the third message.'});
    t.same(parseEvent(buffer), [null, '']);
  });

  await t.test('Event types', async t => {
    let buffer = 'event: add\rdata: 73857293\r\revent: remove\rdata: 2153\r\revent: add\rdata: 113411\r\r';
    let event;
    [event, buffer] = parseEvent(buffer);
    t.same(event, {id: null, type: 'add', text: '73857293'});
    [event, buffer] = parseEvent(buffer);
    t.same(event, {id: null, type: 'remove', text: '2153'});
    [event, buffer] = parseEvent(buffer);
    t.same(event, {id: null, type: 'add', text: '113411'});
    t.same(parseEvent(buffer), [null, '']);
  });

  await t.test('Insignificant whitespace', async t => {
    let buffer = 'data:test\r\n\r\ndata: test\r\n\r\n';
    let event;
    [event, buffer] = parseEvent(buffer);
    t.same(event, {id: null, type: 'message', text: 'test'});
    [event, buffer] = parseEvent(buffer);
    t.same(event, {id: null, type: 'message', text: 'test'});
    t.same(parseEvent(buffer), [null, '']);
  });

  await t.test('Events with comment', async t => {
    let buffer = ': test stream\n\rdata: first event\rid: 1\r\rdata:second event\rid\r\rdata:  third event\n\n';
    let event;
    [event, buffer] = parseEvent(buffer);
    t.same(event, {id: '1', type: 'message', text: 'first event'});
    [event, buffer] = parseEvent(buffer);
    t.same(event, {id: null, type: 'message', text: 'second event'});
    [event, buffer] = parseEvent(buffer);
    t.same(event, {id: null, type: 'message', text: 'third event'});
    t.same(parseEvent(buffer), [null, '']);
  });

  await t.test('Lots of data', async t => {
    let buffer = 'data\n\ndata\ndata\n\ndata:\n\n';
    let event;
    [event, buffer] = parseEvent(buffer);
    t.same(event, {id: null, type: 'message', text: ''});
    [event, buffer] = parseEvent(buffer);
    t.same(event, {id: null, type: 'message', text: '\n'});
    [event, buffer] = parseEvent(buffer);
    t.same(event, {id: null, type: 'message', text: ''});
    t.same(parseEvent(buffer), [null, '']);
  });

  await t.test('Comments', async t => {
    let buffer = buildEvent({comment: 'This is a comment'}).toString();
    t.equal(buffer, ': This is a comment\r\n\r\n');
    t.same(parseEvent(buffer), [null, '']);

    buffer = buildEvent({comment: 'This will be\ntwo comments'}).toString();
    t.equal(buffer, ': This will be\r\n: two comments\r\n\r\n');
    t.same(parseEvent(buffer), [null, '']);
  });

  await t.test('Incomplete event', async t => {
    t.same(parseEvent('data: foo\r\n'), [null, 'data: foo\r\n']);
  });

  await t.test('Unallowed characters', async t => {
    for (const text of ['bar\nbaz', 'bar\rbaz', 'bar\r\nbaz']) {
      const buffer = buildEvent({type: 'foo', text}).toString();
      t.equal(buffer, 'event: foo\r\ndata: bar\r\ndata: baz\r\n\r\n');
      t.same(parseEvent(buffer), [{id: null, type: 'foo', text: 'bar\nbaz'}, '']);
    }
  });
});
