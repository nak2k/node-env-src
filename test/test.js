const test = require('tape');
const { envSrc } = require('..');
const AWS = require('aws-sdk');

AWS.config.update({ region: process.env.AWS_REGION || 'us-west-2' });

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
