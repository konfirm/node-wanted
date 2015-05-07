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
			var config = require(configFile);

			if (!(options.scope in config)) {
				return error('scope not found: ' + options.scope);
			}

			Object.keys(config[options.scope]).forEach(function(module) {
				var version = config[options.scope][module];

				processing.push(module);

				fileExists(options.path + '/node_modules/' + module + '/package.json', function(file) {
					var json, installed;

					if (file) {
						json = require(file);

						if ('version' in json) {
							installed = semver.satisfies(json.version, version);
						}
					}

					if (!installed) {
						request(module, version, installed === false ? json.version : null);
					}
					else {
						wanted.emit('current', {
							module: module,
							version: version,
							installed: json.version
						});

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
		processing = processing.filter(function(mod) {
			return mod !== module;
		});

		if (processing.length <= 0) {
			wanted.emit('ready');
		}
	}

	function request(module, version, installed) {
		if (!/^[a-z0-9_-]+$/.test(module)) {
			return error('Invalid module name: ' + module);
		}

		if (EventEmitter.listenerCount(wanted, 'install') > 0) {
			wanted.emit('install', {
				module: module,
				version: version,
				action: installed ? 'update' : 'install',
				installed: installed,
				accept: function() {
					install(module, version);
				},

				reject: function() {
					unqueue(module);
				}
			});
		}
	}

	function install(module, version) {
		//  accurate enough for our purpose
		var start = Date.now();

		spawn('npm', ['install', module + '@' + version], {cwd:process.cwd()}).on('close', function(status) {
			if (!status) {
				wanted.emit('complete', {
					module: module,
					duration: Date.now() - start
				});
			}
			else {
				error('Failed to install: ' + module);
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
		check(submerge(options || {}, defaults));
	};
}

sys.inherits(Wanted, EventEmitter);

module.exports = new Wanted();
