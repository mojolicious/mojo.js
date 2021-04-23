'use strict';

const { Pattern } = require('..');

const pattern = new Pattern('/foo/:bar/baz');
for (let i = 0; i < 10000000; i++) {
  pattern.match('/test/bar/baz', { endpoint: true });
  pattern.match('/foo/bar/baz', { endpoint: true });
}
