[![npm version](https://badge.fury.io/js/wanted.svg)](http://badge.fury.io/js/wanted)
[![Build Status](https://travis-ci.org/konfirm/node-wanted.svg?branch=master)](https://travis-ci.org/konfirm/node-wanted)
[![Coverage Status](https://coveralls.io/repos/konfirm/node-wanted/badge.svg?branch=master)](https://coveralls.io/r/konfirm/node-wanted?branch=master)
[![dependencies](https://david-dm.org/konfirm/node-wanted.svg)](https://david-dm.org/konfirm/node-wanted#info=dependencies)
[![dev-dependencies](https://david-dm.org/konfirm/node-wanted/dev-status.svg)](https://david-dm.org/konfirm/node-wanted#info=devDependencies)
[![Codacy Badge](https://www.codacy.com/project/badge/cc8e3b668fc6495fbeb7117fdaa61f76)](https://www.codacy.com/app/rogier/node-wanted)

# node-wanted
Get your (dev)dependencies on par with the versions configured in package.json

## Install
It is recommended to use `wanted` in your development workflow, as it is designed for teams who have to deal with dependency changes beyond their own control (a team member updates a dependency in the project `package.json`). `Wanted` can be configured to
```
npm install --save-dev wanted
```

## Usage
There are various ways to work with `wanted`, it can be used as an indicator sending errors if any dependency is not met, automatically update the dependencies and finally a very fine grained event driven mode of operating.

### A simple warning mechanism
This will throw an error mentioning all missing/outdated dependencies (if any)
```js
var Wanted = require('wanted'),
	wanted = new Wanted();

//  no error handling is done, Wanted will throw any error
wanted.check();
```

If any missing/outdated dependency is encountered it will throw an Error like `Update needed: <module> [, <module>]`, which is purely informational but stops the execution of the code in a rather harsh manner.


### Making the warning system slightly more controllable
If a thrown Error does not suit your needs, you can easily prevent this by adding an event handler. It will allow you to inform a developer (or anyone else) and still continue operation or hook into any other workflow.
```js
var Wanted = require('wanted'),
	wanted = new Wanted();

//  handle any error
wanted.on('error', function(error) {
	console.log('Dependency not up-to-date: ' + error);
});

wanted.check();
```

If any missing/outdated dependency is encountered it will emit and `error`-event with a message like `Update needed: <module> [, <module>]`, which is purely informational.

### Finegrained control
For more demanding development workflows where it is necessary to control each individual package (e.g. you need to stick to a specific version and cannot trust yourself or co-workers to leave the `package.json` alone), you can listen to `install`-events and choose to `accept` or `reject` the installation
```js
var Wanted = require('wanted'),
	wanted = new Wanted();

wanted.on('install', function(module) {
	console.log(module);

	//  prevent any installation/upgrade of the blame package outside the ~1.0.3 range (>= 1.0.3 && < 1.1.0)
	//  (even though we do update this module for a reason ;-) )
	if (module.name === 'blame' && module.version !== '~1.0.3') {
		console.error('We have pinned the installation of blame to be >= 1.0.3 and < 1.1.0 for some reason');
		module.reject();
	}
	//  silently accept anything else
	else {
		module.accept();
	}
});

wanted.check();
```

## API
### `check([object options])`
Start the dependency checks, the options object is entirely optional and contains the following (overrulable) settings:
- `path` (default: the current working directory) - the path to check the package.json and installed modules
- `scope` (default: `'devDependencies'`) - the scope within the `package.json` (e.g. `dependencies`, `devDependencies`, `optionalDependencies`). As of version 1.2.0 `scope` may be either a string with the scope name, or an array strings
- `autoAccept` (default: false) - whether or not to update dependencies automatically (this setting has no effect if an `install`-handler is in place)

### `require(mixed module [, bool version])` (Added in 1.3.0, version option added in 1.3.1)
Require a module, which is installed if needed. If the `version` argument is true(-ish), it will also check whether or not the version installed matches the version configured in package.json. In case there is no configuration the version to compare against will always be 'latest'.

#### `require(string module [, bool version])`
Acting in a very similar way `npm install` does, if there is a (`dev|optional`)dependency from which the version can be obtained Wanted will do so, and default to `latest` otherwise.

```
var Wanted = require('wanted'),
	wanted = new Wanted(),
	myModule = wanted.require('my-module');
```

#### `require(object module [, bool version])`
If more control is needed, you can specify the version you expect by providing a configuration object in which a (semver) version can be specified, if a version is specified it will act as if the `version` argument contained `true` and the installed version (if-any) will be compared to the required version.

```
var Wanted = require('wanted'),
	wanted = new Wanted(),
	myModule = wanted.require({
		name: 'my-module',
		version: '1.0.0'
	});
```

In this example the installed version is up- or downgraded to match the specified version.
**NOTE** This has the potential to wreck havoc in your project as wanted will do as you say regardless of other dependencies, the module which will be up-/downgraded will be the one in your `node_modules` folder.

### `on(string event, function handler)`
Register an event handler (refer to the [events section](###events) for all events and their handler arguments)

### `off([string event [, function handler]])`
Remove a single, all for a specific event or simply all event handlers

### events
#### `error` (handler arguments: `string message`)
The `error`-handler is called whenever [an error](##Errors) is encountered.

### `current` (handler arguments: `object module`)
The `current`-handler is called for each module which is on par with the specified (semver) version, the `object module` contains the following properties:
- `name`: the module name
- `version`: the (semver) version specified in the `package.json`
- `installed`: `string x.x.x`, indicating the installed version
- `state`: the state in which the module is according to `Wanted` (for the `current`-event, the value is always `'current'`)

### `install` (handler arguments: `object module`)
The `install`-handler is called for each module which is not 'current', hence it needs installment or updating, the `object module` contains the following properties:
- `name`: the module name
- `version`: the (semver) version specified in the `package.json`
- `installed`: `null` if not installed, `string x.x.x` otherwise, indicating the installed version
- `state`: the state in which the module is according to `Wanted` (for the `install`-event, the value is one of: `'install'` or `'update'`)
- `accept`: function to call in order to accept the install/update of the module
- `reject`: function to call in order to reject the install/update of the module
- `scope`: _(Added in 1.2.0)_ the dependency scope for the module (e.g. `'dependencies'`, `'devDependencies'`)

**NOTE** If an `install`-handler is available, it *must* invoke either `accept` or `reject` as `Wanted` will not continue operation before one of those methods is invoked.

### `complete` (handler arguments: `object module`)
The `complete`-handler is called whener an (auto)accepted module update/install is completed, the `object module` contains the following properties:
- `name`: the module name
- `version`: the (semver) version specified in the `package.json`
- `installed`: `null` if not installed, `string x.x.x` otherwise, indicating the installed version
- `state`: the state in which the module is according to `Wanted` (for the `current`-event, the value is always `'current'`)


### `ready` (handler arguments: `array modules`)
The `ready`-handler is called when `Wanted` is done checking/updating/installing the dependencies



## Errors
All errors are either thrown (ending the execution) or emitted. Error emission is only done if there are actual `error`-handlers available.
Possible errors are:
- `No package.json` - there is no `package.json` file (e.g. not a node project) in the (specified) path, _once per `check`_
- `Scope not found: <scope>` - the (specified) scope does not exist in the `package.json`, _once per `check`_
- `Update needed: <module> [, <module>]` - one or more modules need to be updated (obviously never thrown if `autoAccept` is true or modules are programatically accepted), _once per `check`_
- `Invalid module name: <name>` - the module name does not conform to the npm module name convention (no attempt to install it is made), _once per module_
- `Failed to install: <name>` - the module could not be installed (e.g. it was not found on npmjs.org), _once per module_


## License
GPLv2 © [Konfirm ![Open](https://kon.fm/open.svg)](//kon.fm/site)
