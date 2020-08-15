import parallel = require('run-parallel');
import { readFile } from 'fs';
import type { SSM } from 'aws-sdk';
import RunParallel = require('run-parallel');

export interface EnvSrcJsonOptions {
  path: string;
}

export interface EnvSrcSsmOptions {
  path: string;
  recursive: boolean;
  withDecryption: boolean;
}

export interface EnvSrcOption {
  json?: EnvSrcJsonOptions;
  ssm?: EnvSrcSsmOptions;
}

interface EnvSrcOptionMap {
  json: EnvSrcJsonOptions;
  ssm: EnvSrcSsmOptions;
}

interface EnvObj {
  [name: string]: string;
}

type EnvObjCallback = (err: Error | null, env?: EnvObj) => void;

let ssm: SSM;

const loaders: {
  [name in keyof EnvSrcOptionMap]: (options: EnvSrcOptionMap[name], callback: EnvObjCallback) => void;
} = {
  json(options: EnvSrcJsonOptions, callback) {
    readFile(options.path, 'utf8', (err, data) => {
      if (err) {
        return callback(err);
      }

      try {
        callback(null, JSON.parse(data));
      } catch (err) {
        callback(err);
      }
    });
  },

  ssm(options: EnvSrcSsmOptions, callback) {
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

      callback(null, Parameters.reduce((env: EnvObj, { Name, Value }) => {
        Name = Name!.substr(options.path.length + 1).replace('/', '_');

        env[Name] = Value!;

        return env;
      }, {}));
    });
  },
};

export function envSrc(options: EnvSrcOption | EnvSrcOption[], callback: EnvObjCallback) {
  const options_ = Array.prototype.concat(options) as EnvSrcOption[];

  const tasks = options_.reduce((tasks, option) => {
    Object.keys(option).map((type) => {
      const loader = loaders[type as keyof EnvSrcOptionMap];

      if (!loader) {
        tasks.push((callback: RunParallel.TaskCallback<EnvObj>) =>
          callback(new Error(`Unknown source type '${type}'`)));
        return;
      }

      tasks.push(loader.bind(null, option[type as keyof EnvSrcOptionMap] as any));
    });

    return tasks;
  }, [] as RunParallel.Task<EnvObj>[]);

  parallel<EnvObj>(tasks, (err, result) => {
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
