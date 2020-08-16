const test = require('tape');
const { envSrc } = require('..');
const AWS = require('aws-sdk');

test('test', t => {
  t.plan(3);

  envSrc({
    json: {
      path: __dirname + '/env.json',
    },

    ssm: {
      path: '/test-env-src',
      recursive: true,
    },
  }).then(() => {
    const { env } = process;

    t.equal(env.JSON_FOO, 'foo');
    t.equal(env.SSM_FOO, 'foo');
    t.equal(env.SSM_BAR, 'bar');
  }).catch(err => {
    t.error(err);
  });
});
