'use strict';

var Code = require('code'),
	Lab = require('lab'),
	Wanted = require('../lib/wanted'),
	lab = exports.lab = Lab.script();

lab.experiment('Wanted - Defaults', function() {
	lab.test('Checks the project itself', function(done) {
		var wanted = new Wanted();

		wanted.on('ready', function(report) {
			Code.expect(report.filter(function(module) {
				return module.scope !== 'devDependencies';
			}).length).to.equal(0);

			Code.expect(report.filter(function(module) {
				return module.state !== 'current';
			}).length).to.equal(0);

			done();
		});

		wanted.check();
	});

});
