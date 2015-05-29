'use strict';
var Wanted = require('./lib/wanted'),
	wanted = new Wanted();

wanted.on('error', function(error) {
	console.log('error', error);
});

wanted.on('install', function(install) {
	var action = '<unknown>';

	//  prevent updates for non dev-dependencies (will install missing and devDependency modules)
	if (/^dev/.test(install.scope) || install.state === 'install') {
		install.accept();
		action = 'accepted';
	}
	else {
		install.reject();
		action = 'rejected';
	}

	console.log('%s %s %s: %s (%s)', action, install.state, install.scope, install.name, install.version);
});

wanted.on('current', function(module) {
	console.log('current', module);
});

wanted.on('ready', function() {
	console.log('ready');
});

wanted.on('complete', function(module) {
	console.log('updated', module);
});

wanted.check({scope: ['dependencies', 'devDependencies']});
