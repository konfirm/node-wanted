'use strict';

var Code = require('code'),
	Lab = require('lab'),
	Wanted = require('../lib/wanted'),
	helper = require('./helper'),
	lab = exports.lab = Lab.script(),
	moduleName = 'we-hope-no-one-creates-a-module-with-this-name-as-it-would-break-the-unit-test',
	path;

lab.experiment('Wanted - Unknown', function() {
	path = process.cwd() + '/node_modules/';

	lab.after(function(done) {
		helper.cleanup(path + 'blame', function() {
			helper.cleanup(path + moduleName, done);
		});
	});

	lab.experiment('Install requirements', function() {
		lab.test('Require an unknown module', {timeout: 15000}, function(done) {
			var counter = 0,
				wanted = new Wanted(),
				blame = wanted.require({name:'blame'});

			//  we expect the blame module to exist and be the (version agnostic) module we wanted
			Code.expect('stack' in blame).to.equal(true);
			Code.expect(typeof blame.stack).to.equal('function');

			done();
		});

		lab.test('Require the now known module', {timeout: 15000}, function(done) {
			var counter = 0,
				wanted = new Wanted(),
				blame = wanted.require('blame');

			//  we expect the blame module to exist and be the (version agnostic) module we wanted
			Code.expect('stack' in blame).to.equal(true);
			Code.expect(typeof blame.stack).to.equal('function');

			done();
		});

		lab.test('Require an unknown module', {timeout: 15000}, function(done) {
			var counter = 0,
				wanted = new Wanted(),
				caught = 0,
				error, unknown;

			try {
				unknown = wanted.require(moduleName);
			}
			catch (e) {
				++caught;
				error = e;
			}

			//  we expect to have recieved an error
			Code.expect(error.message).to.equal('Failed to install: ' + moduleName);
			Code.expect(caught).to.equal(1);

			done();
		});
	});

});
