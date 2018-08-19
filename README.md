# env-src

Set environment variables from various sources.

## Installation

```
npm i env-src
```

## Usage

``` javascript
const { envSrc } = require('env-src');

envSrc([
  {
    json: {
      path: 'path/to/env.json',
    },
  },
  {
    ssm: {
      path: '/my-app',
      recursive: true,
      withDecryption: true,
    },
  },
], err => {
  // ...
});
```

## envSrc(options, callback)

- `options`
  - An object of source definitions, or an array of the one.
- `callback(err)`
  - A function that is called when setting environment variables is completed or an error occurs.

The object of source definitions has the following keys:

- `json`
  - This key means that a json file is loaded as source.
  - The value is specified an object that has the following properties:
    - `path` - A path of the json file.
- `ssm`
  - This key means that environment variables are defined in AWS SSM Parameter Store.
  - The value is specified an object that has the following properties:
    - `path` - A path to obtain parameters.
    - `recursive` - A boolean value that determines whether to obtain parameters recursively.
    - `withDecryption` - If this is true, values of secure strings are decrypted.

## License

MIT
