'use strict';
var Wanted = require('./lib/wanted'),
	wanted = new Wanted();

wanted.on('error', function(error) {
	console.log('error', error);
});

wanted.on('install', function(install) {
	install.accept();
	console.log('installing', install);
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

wanted.check({scope: 'devDependencies'});
