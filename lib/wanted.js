'use strict';

var sys = require('sys'),
	polymorphic = require('polymorphic'),
	submerge = require('submerge'),
	EventEmitter = require('events').EventEmitter;

function Wanted() {
	var wanted = this,
		fs = require('fs'),
		spawn = require('child_process').spawn,
		semver = require('semver'),
		defaults = {
			scope: 'devDependencies',
			path: process.cwd()
		},
		processing = [];

	EventEmitter.apply(wanted, arguments);

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
				return error('no package.json');
			}

			config = require(configFile);

			if (!(options.scope in config)) {
				return error('scope not found: ' + options.scope);
			}

			Object.keys(config[options.scope]).forEach(function(name) {
				var version = config[options.scope][name],
					module = {
						name: name,
						version: version,
						installed: null,
						skipped: false,
						processed: false
					};

				processing.push(module);

				fileExists(options.path + '/node_modules/' + name + '/package.json', function(file) {
					var json, installed;

					if (file) {
						json = require(file);
						module.installed = json.version;
						module.upgrade   = !semver.satisfies(json.version, version);
					}

					if (!module.installed || module.upgrade) {
						request(module, options);
					}
					else {
						module.current = true;
						wanted.emit('current', module);

						unqueue(module);
					}
				});
			});
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
	 *  @name    unqueue
	 *  @access  internal
	 *  @param   object  module
	 *  @return  void
	 */
	function unqueue(module) {
		var waiting = 0,
			install = [],
			total = processing.length;

		processing.forEach(function(mod) {
			if (mod === module) {
				module.processed = true;

				if (!module.installed) {
					install.push(module.name);
				}
			}

			if (!module.processed) {
				++waiting;
			}
		});

		if (!waiting) {
			processing = [];

			if (install.length) {
				error('Update needed: ' + install.join(', '));
			}
			else {
				wanted.emit('ready', {
					modules: total
				});
			}
		}
	}

	/**
	 *  Request (via event) for a module update, if no event handler is present, the request is always rejected
	 *  @name    request
	 *  @access  internal
	 *  @param   object  module
	 *  @param   object  options
	 *  @return  void
	 */
	function request(module, options) {
		if (!/^[a-z0-9_-]+$/.test(module.name)) {
			return error('Invalid module name: ' + module.name);
		}

		if (EventEmitter.listenerCount(wanted, 'install') > 0) {
			wanted.emit('install', {
				name: module.name,
				version: module.version,
				action: module.upgrade ? 'update' : 'install',
				installed: module.installed,
				accept: function() {
					process.nextTick(function() {
						install(module, options);
					});
				},

				reject: function() {
					process.nextTick(function() {
						module.skipped = true;
						unqueue(module);
					});
				}
			});
		}
		else {
			module.skipped = true;
			unqueue(module);
		}
	}

	/**
	 *  Trigger the install/update of a module
	 *  @name    install
	 *  @access  internal
	 *  @param	 object module
	 *  @param   object options
	 *  @return  void
	 */
	function install(module, options) {
		//  accurate enough for our purpose
		var start = Date.now();

		//  TODO: research if we can use npm as module and not resolve to a shell
		//  The main reason not to do this now is the warning npm will issue if installed locally

		spawn('npm', ['install', module.name + '@' + module.version], {cwd: options.path})
			.on('close', function(status) {
				if (status === 0) {
					module.duration = Date.now() - start;
					module.installed = true;

					wanted.emit('complete', module);
				}
				else {
					module.error = true;
					error('Failed to install: ' + module.name);
				}

				unqueue(module);
			});
	}

	/**
	 *  remove event/listeners from the Wanted EventEmitter
	 *  @name    off
	 *  @access  public
	 *  @param   string   event   [optional, default undefined - remove all event handlers]
	 *  @param   function handler [optional, default undefined - remove all (named) event handlers]
	 */
	wanted.off = polymorphic();
	wanted.off.signature('void', 'string event', function(event) {
		return wanted.removeAllListeners.apply(wanted, arguments);
	});

	wanted.off.signature('string event, function handler', function(event, handler) {
		return wanted.removeListener.apply(wanted, arguments);
	});

	/**
	 *  Start the dependency check
	 *  @name    check
	 *  @access  public
	 *  @param   Object options [optional, default undefined - {path: <current working directory>, scope: 'devDependencies'}]
	 *  @return  void
	 */
	wanted.check = function(options) {
		check(submerge(options, defaults));
	};
}

sys.inherits(Wanted, EventEmitter);

module.exports = Wanted;
