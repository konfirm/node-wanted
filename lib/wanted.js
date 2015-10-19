'use strict';

var util = require('util'),
	polymorphic = require('polymorphic'),
	submerge = require('submerge'),
	EventEmitter = require('events').EventEmitter;

function Wanted() {
	var wanted = this,
		fs = require('fs'),
		childProcess = require('child_process'),
		semver = require('semver'),
		defaults = {
			scope: ['devDependencies'],
			path: process.cwd(),
			autoAccept: false
		},
		pool;

	EventEmitter.apply(wanted, arguments);

	/**
	 *  Initialize the Wanted instance
	 *  @name    init
	 *  @access  internal
	 *  @return  void
	 */
	function init() {
		reset();
	}

	/**
	 *  Reset the pool
	 *  @name    reset
	 *  @return  pool
	 */
	function reset() {
		pool = {
			queue: [],
			install: [],
			processed: []
		};
	}

	/**
	 *  Trigger an error emission or throw it, depending on where a listener for error emission is present
	 *  @name    error
	 *  @access  internal
	 *  @param   string  message
	 *  @return  void
	 */
	function error(message) {
		if (EventEmitter.listenerCount(wanted, 'error') > 0) {
			return wanted.emit('error', message);
		}

		throw new Error(message);
	}

	/**
	 *  Remove a module from the queue
	 *  @name    processed
	 *  @access  internal
	 *  @param   object  module
	 *  @return  void
	 */
	function processed(module) {
		pool.processed.push(module);

		if (!module.installed) {
			pool.install.push(module);
		}

		setImmediate(next);
	}

	/**
	 *  Pick the next item from the queue and process it
	 *  @name    next
	 *  @return  void
	 */
	function next() {
		var module;

		if (pool.queue.length <= 0) {
			if (pool.install.length) {
				error('Update needed: ' + pool.install.map(function(module) {
					return module.name;
				}).join(', '));
			}
			else {
				wanted.emit('ready', pool.processed.map(shallow));
			}

			return reset();
		}

		module = pool.queue.shift();

		fileExists(module.path + '/package.json', function(file) {
			var json;

			if (file) {
				json = require(file);
				module.installed = json.version;
				module.upgrade   = !semver.satisfies(json.version, module.version);
			}

			if (!module.installed || module.upgrade) {
				request(module);
			}
			else {
				module.current = true;
				wanted.emit('current', shallow(module));

				processed(module);
			}
		});
	}

	/**
	 *  Load the package.json in the given path and inspect the dependencies in the given scope
	 *  @name    check
	 *  @access  internal
	 *  @param   object  options
	 *  @return  void
	 */
	function check(options) {
		fileExists(options.path + '/package.json', function(configFile) {
			var config;

			if (!configFile) {
				return error('No package.json');
			}

			config = require(configFile);

			options.scope.forEach(function(scope) {
				if (!(scope in config)) {
					return error('Scope not found: ' + scope);
				}

				Object.keys(config[scope]).forEach(function(name) {
					var version = config[scope][name],
						module = {
							options: options,
							path: options.path + '/node_modules/' + name,
							name: name,
							version: version,
							installed: null,
							scope: scope
						};

					pool.queue.push(module);
				});
			});

			next();
		});
	}

	/**
	 *  Simple wrapper around fs.exists, allowing us to provide the filename in case it does exist
	 *  @name    fileExists
	 *  @access  internal
	 *  @param   string    file
	 *  @param   function  handle
	 *  @return  void
	 */
	function fileExists(file, handle) {
		fs.exists(file, function(exists) {
			handle.apply(null, exists ? [file] : []);
		});
	}

	/**
	 *  Trigger the install/update of a module
	 *  @name    install
	 *  @access  internal
	 *  @param	 object module
	 *  @param   bool   sync  [optional, default undefined - not sync]
	 *  @return  void
	 */
	function install(module, sync) {
		//  accurate enough for our purpose
		var start = Date.now(),
			arg = ['npm', ['install', module.name + '@' + module.version], {cwd: module.options.path}];

		if (!sync) {
			return childProcess.spawn.apply(childProcess.spawn, arg)
				.on('close', function(status) {
					if (status === 0) {
						module.duration = Date.now() - start;
						module.installed = true;

						wanted.emit('complete', shallow(module));
					}
					else {
						module.error = true;
						error('Failed to install: ' + module.name);
					}

					processed(module);
				});
		}

		return childProcess.spawnSync.apply(childProcess.spawn, arg);
	}

	/**
	 *  Request (via event) for a module update, if no event handler is present, the request is always rejected
	 *  @name    request
	 *  @access  internal
	 *  @param   object  module
	 *  @return  void
	 */
	function request(module) {
		var dispatch;

		if (!/^[a-z0-9_-]+$/.test(module.name)) {
			return error('Invalid module name: ' + module.name);
		}

		dispatch = shallow(module);
		dispatch.accept = function() {
			setImmediate(function() {
				install(module);
			});
		};

		dispatch.reject = function() {
			setImmediate(function() {
				module.skipped = true;
				processed(module);
			});
		};

		if (EventEmitter.listenerCount(wanted, 'install') > 0) {
			wanted.emit('install', dispatch);
		}
		else if (module.options.autoAccept) {
			dispatch.accept();
		}
		else {
			dispatch.reject();
		}
	}

	/**
	 *  Reduce the internal module configuration for external exposure
	 *  @name    shallow
	 *  @param   Object  module
	 *  @return  Object  shallow module
	 */
	function shallow(module) {
		return {
			name: module.name,
			version: module.version,
			installed: module.installed,
			scope: module.scope,
			state: module.current ? 'current' : (module.upgrade ? 'upgrade' : 'install')
		};
	}

	/**
	 *  Add a version to a module configuration if it is missing (tries to obtain it from the package.json, defaults to 'latest')
	 *  @name    determineVersion
	 *  @access  internal
	 *  @param   Object  module
	 *  @return  void
	 */
	function determineVersion(module) {
		var json;

		if (!('version' in module)) {
			json = module.options.path + '/package.json';
			delete require.cache[json];
			json = require(json);

			['dependencies', 'devDependencies', 'optionalDependencies'].forEach(function(dep) {
				if (dep in json && module.name in json[dep]) {
					module.version = json[dep][module.name];
				}
			});
		}
	}

	/**
	 *  remove event/listeners from the Wanted EventEmitter
	 *  @name    off
	 *  @access  public
	 *  @param   string   event   [optional, default undefined - remove all event handlers]
	 *  @param   function handler [optional, default undefined - remove all (named) event handlers]
	 */
	wanted.off = polymorphic();
	wanted.off.signature('void', 'string event', function() {
		return wanted.removeAllListeners.apply(wanted, arguments);
	});

	wanted.off.signature('string event, function handler', function() {
		return wanted.removeListener.apply(wanted, arguments);
	});

	/**
	 *  Require a module, installing it if it doesn't exist
	 *  @name    require
	 *  @access  public
	 *  @param   mixed     module  [one of: string name, object {name: <name>, version: <version>, options: {path: <path>}}]
	 *  @param   bool      version  [optional, default undefined - do not verify semver version]
	 *  @return  function  required
	 */
	wanted.require = function(module, version) {
		var json, error;

		module = submerge(typeof module === 'object' ? module : {}, {
			name: module,
			options: {
				path: process.cwd()
			}
		});

		//  add the most appropriate version (one of: provided, configured or 'latest' as failsafe)
		determineVersion(module);

		try {
			json = require(require.resolve(module.name).replace(new RegExp('(node_modules/' + module.name + ').*$'), '$1/package.json'));

			if ((version || module.version) && !semver.satisfies(json.version, module.version || 'latest')) {
				throw new Error('Module need update');
			}
		}
		catch (e) {
			if (!('version' in module)) {
				module.version = 'latest';
			}

			error = (install(module, true).stderr + '')
				.split('\n')
				.filter(function(line) {
					return /^npm err! ([0-9]+)/i.test(line);
				});

			if (error.length) {
				throw new Error('Failed to install: ' + module.name);
			}
		}

		return require(module.name);
	};

	/**
	 *  Start the dependency check
	 *  @name    check
	 *  @access  public
	 *  @param   Object options [optional, default undefined - {path: <current working directory>, scope: 'devDependencies'}]
	 *  @return  void
	 */
	wanted.check = function(options) {
		if (options && 'scope' in options && typeof options.scope === 'string') {
			options.scope = [options.scope];
		}

		check(submerge(options, defaults));
	};

	init();
}

util.inherits(Wanted, EventEmitter);

module.exports = Wanted;
