'use strict';

var Code = require('code'),
	Lab = require('lab'),
	Wanted = require('../lib/wanted'),
	helper = require('./helper'),
	lab = exports.lab = Lab.script(),
	path;

lab.experiment('Wanted - Rejected', function() {
	path = __dirname + '/dummy_reject';

	lab.beforeEach(function(done) {
		helper.prepare(path, {
			dependencies: {
				polymorphic: '^1.0.0'
			},
			devDependencies: {
				blame: '^1.0.0'
			}
		}, done);
	});

	lab.afterEach(function(done){
		helper.cleanup(path, done);
	});


	lab.experiment('Rejecting update events', function() {
		lab.test('no error handler, throws error', function(done) {
			var sandbox = require('domain').create();

			sandbox.on('error', function(error) {
				Code.expect(error.message).to.equal('Update needed: blame');

				done();
			});

			sandbox.run(function() {
				var wanted = new Wanted();

				wanted.on('install', function(module) {
					module.reject();
				});

				wanted.check({path: path});
			});
		});

		lab.test('error handler, emits error', function(done) {
			var wanted = new Wanted();

			wanted.on('error', function(error) {
				Code.expect(error).to.equal('Update needed: blame');

				done();
			});

			wanted.on('install', function(module) {
				module.reject();
			});

			wanted.check({path: path});
		});

		lab.test('removed error handler, throws error', function(done) {
			var counter = 0,
				sandbox = require('domain').create();

			sandbox.on('error', function(error) {
				Code.expect(error.message).to.equal('Update needed: blame');
				Code.expect(counter).to.equal(0);

				done();
			});

			sandbox.run(function() {
				var wanted = new Wanted();

				wanted.on('error', function() {
					++counter;
				});

				wanted.on('install', function(module) {
					module.reject();
				});

				wanted.off('error');

				wanted.check({path: path});
			});
		});
	});

});
