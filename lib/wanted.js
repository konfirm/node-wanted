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

	function fileExists(file, handle) {
		fs.exists(file, function(exists) {
			handle.apply(null, exists ? [file] : []);
		});
	}

	function error(message) {
		if (EventEmitter.listenerCount(wanted, 'error') > 0) {
			return wanted.emit('error', message);
		}

		throw new Error(message);
	}

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

	wanted.off = polymorphic();
	wanted.off.signature('void', 'string event', function(event) {
		return wanted.removeAllListeners.apply(wanted, arguments);
	});

	wanted.off.signature('string event, function handler', function(event, handler) {
		return wanted.removeListener.apply(wanted, arguments);
	});

	wanted.check = function(options) {
		check(submerge(options, defaults));
	};
}

sys.inherits(Wanted, EventEmitter);

module.exports = Wanted;
