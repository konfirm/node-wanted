'use strict';
var wanted = require('./lib/wanted');

wanted.on('error', function(error) {
	console.log('error', error);
});

wanted.on('install', function(install) {
	console.log('install', install);

	install.accept();
});

wanted.on('current', function(module) {
	console.log('current', module);
});

wanted.on('ready', function() {
	console.log('ready', wanted);
});

wanted.on('complete', function(module) {
	console.log('updated', module);
});

wanted.check({scope: 'dependencies'});
