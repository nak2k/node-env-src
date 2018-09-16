const test = require('tape');
const { envSrc } = require('..');
const AWS = require('aws-sdk');

test('test', t => {
  t.plan(4);

  envSrc({
    json: {
      path: __dirname + '/env.json',
    },

    ssm: {
      path: '/test-env-src',
      recursive: true,
    },
  }, err => {
    t.error(err);

    const { env } = process;

    t.equal(env.JSON_FOO, 'foo');
    t.equal(env.SSM_FOO, 'foo');
    t.equal(env.SSM_BAR, 'bar');
  });
});
