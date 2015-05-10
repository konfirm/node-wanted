'use strict';

var domain = require('domain'),
	fs = require('fs'),
	rimraf = require('rimraf');

function write(path, contents, done) {
	fs.writeFile(path, JSON.stringify(contents), done);
}

module.exports = {
	//  create a domain sandbox with an error handler attached and return a single function
	sandbox: function(error) {
		var sandbox = domain.create();

		if (error) {
			sandbox.on('error', error);
		}

		return function(run) {
			sandbox.run(run);
		};
	},

	//  create a fake node module (a directory containing only a package.json)
	prepare: function(path, config, done) {
		fs.exists(path, function(exist) {
			var file = path + '/package.json';

			if (exist) {
				write(file, config, done);
			}
			else {
				fs.mkdir(path, function() {
					write(file, config, done);
				});
			}
		});
	},

	write: function(path, contents, done) {
		return write(path, contents, done);
	},

	//  clean up a directory/file
	cleanup: function(path, done) {
		rimraf(path, done);
	},

	purgeRequired: function(contains) {
		Object.keys(require.cache).forEach(function(reqPath) {
			if (reqPath.indexOf(contains) >= 0) {
				delete require.cache[reqPath];
			}
		});
	}
};
