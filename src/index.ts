import { promises } from 'fs';
import type { SSM } from 'aws-sdk';

const { readFile } = promises;

export interface EnvSrcJsonOptions {
  path: string;
}

export interface EnvSrcSsmOptions {
  path: string;
  recursive?: boolean;
  withDecryption?: boolean;
}

export interface EnvSrcOption {
  json?: EnvSrcJsonOptions;
  ssm?: EnvSrcSsmOptions;
}

interface EnvObj {
  [name: string]: string;
}

let ssm: SSM;

export async function envSrc(options: EnvSrcOption | EnvSrcOption[]): Promise<void> {
  const options_ = Array.prototype.concat(options) as EnvSrcOption[];

  const tasks = options_.reduce((tasks, option) => {
    Object.keys(option).map((type) => {
      if (type === 'json') {
        tasks.push(envSrcJson(option.json!));
      } else if (type === 'ssm') {
        tasks.push(envSrcSsm(option.ssm!));
      } else {
        throw new Error(`Unknown source type '${type}'`);
      }
    });

    return tasks;
  }, [] as Promise<void>[]);

  await Promise.all(tasks);
}

function applyEnv(env: EnvObj) {
  Object.keys(env).forEach(key => {
    if (process.env[key] === undefined) {
      process.env[key] = env[key];
    }
  });
}

export async function envSrcJson(options: EnvSrcJsonOptions): Promise<void> {
  const data = await readFile(options.path, 'utf8');

  applyEnv(JSON.parse(data));
}

export async function envSrcSsm(options: EnvSrcSsmOptions): Promise<void> {
  ssm || (ssm = new (require('aws-sdk')).SSM());

  const params = {
    Path: options.path,
    Recursive: options.recursive,
    WithDecryption: options.withDecryption,
  };

  const data = await ssm.getParametersByPath(params).promise();

  const { Parameters } = data;

  if (!Parameters) {
    return;
  }

  const env = Parameters.reduce((env, { Name, Value }) => {
    Name = Name!.substr(options.path.length + 1).replace('/', '_');

    env[Name] = Value!;

    return env;
  }, {} as EnvObj);

  applyEnv(env);
}
