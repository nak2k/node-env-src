import parallel = require('run-parallel');
import { readFile } from 'fs';
import type { SSM } from 'aws-sdk';

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

interface EnvObj {
  [name: string]: string;
}

type EnvObjCallback = (err: Error | null, env?: EnvObj) => void;

let ssm: SSM;

export function envSrc(options: EnvSrcOption | EnvSrcOption[], callback: EnvObjCallback) {
  const options_ = Array.prototype.concat(options) as EnvSrcOption[];

  const tasks = options_.reduce((tasks, option) => {
    Object.keys(option).map((type) => {
      if (type === 'json') {
        tasks.push(envSrcJson.bind(null, option.json!));
      } else if (type === 'ssm') {
        tasks.push(envSrcSsm.bind(null, option.ssm!));
      } else {
        tasks.push((callback: parallel.TaskCallback<EnvObj>) =>
          callback(new Error(`Unknown source type '${type}'`)));
      }
    });

    return tasks;
  }, [] as parallel.Task<EnvObj>[]);

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

function envSrcJson(options: EnvSrcJsonOptions, callback: EnvObjCallback) {
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
}

function envSrcSsm(options: EnvSrcSsmOptions, callback: EnvObjCallback) {
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
      Name = Name!.substr(options.path.length + 1).replace('/', '_');

      env[Name] = Value!;

      return env;
    }, {} as EnvObj));
  });
}
