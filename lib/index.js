const parallel = require('run-parallel');
const { readFile } = require('fs');

let ssm;

const loaders = {
  json(options, callback) {
    readFile(options.path, 'utf8', (err, data) => {
      if (err) {
        return callback(err);
      }

      try {
        callback(null, JSON.parse(data));
      } catch(err) {
        callback(err);
      }
    });
  },

  ssm(options, callback) {
    ssm || (ssm = new (require('aws-sdk')).SSM());

    const params = {
      Path: options.path,
      Recursive: options.recursive,
      WithDecryption: options.withDecryption,
    };

    ssm.getParametersByPath(params, (err, data) => {
      if (err) {
        return callback(err);
      }

      const { Parameters } = data;

      if (!Parameters) {
        return callback(null, {});
      }

      callback(null, Parameters.reduce((env, { Name, Value }) => {
        Name = Name.substr(options.path.length + 1).replace('/', '_');

        env[Name] = Value;

        return env;
      }, {}));
    });
  },
};

function envSrc(options, callback) {
  options = Array.prototype.concat(options);

  const tasks = options.reduce((tasks, option) => {
    Object.keys(option).map(type => {
      const loader = loaders[type];

      if (!loader) {
        tasks.push(callback =>
          callback(new Error(`Unknown source type '${type}'`)));
        return;
      }

      tasks.push(loader.bind(null, option[type]));
    });

    return tasks;
  }, []);

  parallel(tasks, (err, result) => {
    if (err) {
      return callback(err);
    }

    result.forEach(env => {
      Object.keys(env).forEach(key => {
        if (process.env[key] === undefined) {
          process.env[key] = env[key];
        }
      });
    });

    callback(null);
  });
}

/*
 * Exports.
 */
exports.envSrc = envSrc;
