'use strict';

var Code = require('code'),
	Lab = require('lab'),
	Wanted = require('../lib/wanted'),
	helper = require('./helper'),
	lab = exports.lab = Lab.script(),
	path;

lab.experiment('Wanted - Invalid', function() {
	path = __dirname + '/dummy_invalid';

	lab.before(function(done) {
		helper.prepare(path, {
			dependencies: {
				polymorphic: '^1.0.0'
			},
			devDependencies: {
				'name is invalid': '^0.0.0'
			}
		}, done);
	});

	lab.after(function(done) {
		helper.cleanup(path, done);
	});

	lab.experiment('Install "name is invalid"', function() {

		lab.test('no error handler, throws error', function(done) {
			var sandbox = require('domain').create();

			sandbox.on('error', function(error) {
				Code.expect(error.message).to.equal('Invalid module name: name is invalid');

				done();
			});

			sandbox.run(function() {
				var wanted = new Wanted();

				wanted.check({path: path});
			});
		});

		lab.test('error handler, emits error', function(done) {
			var wanted = new Wanted();

			wanted.on('error', function(error) {
				Code.expect(error).to.equal('Invalid module name: name is invalid');

				done();
			});

			wanted.check({path:path});
		});

		lab.test('removed error handler, throws error', function(done) {
			var counter = 0,
				sandbox = require('domain').create();

			sandbox.on('error', function(error) {
				Code.expect(error.message).to.equal('Invalid module name: name is invalid');
				Code.expect(counter).to.equal(0);

				done();
			});

			sandbox.run(function() {
				var wanted = new Wanted();

				function errorHandler() {
					++counter;
				}

				wanted.on('error', errorHandler);
				wanted.off('error', errorHandler);

				wanted.check({path: path});
			});
		});

	});

});
