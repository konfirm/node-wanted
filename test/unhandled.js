'use strict';

var Code = require('code'),
	Lab = require('lab'),
	Wanted = require('../lib/wanted'),
	helper = require('./helper'),
	lab = exports.lab = Lab.script(),
	path;

lab.experiment('Wanted - Unhandled', function() {
	lab.experiment('No package.json', function() {

		lab.test('No error handler, throws error', function(done) {
			var sandbox = helper.sandbox(function(error) {
					Code.expect(error.message).to.equal('No package.json');

					done();
				});

			sandbox(function() {
				var wanted = new Wanted();

				wanted.check({path: __dirname + '/nope'});
			});
		});

		lab.test('Error handler, emits error', function(done) {
			var counter = 0,
				sandbox = helper.sandbox(function() {
					++counter;
				});

			sandbox(function() {
				var wanted = new Wanted();

				wanted.on('error', function(error) {
					Code.expect(error).to.equal('No package.json');
					Code.expect(counter).to.equal(0);

					done();
				});

				wanted.check({path: __dirname + '/nope'});
			});
		});

		lab.test('Removed error handler, throws error', function(done) {
			var counter = 0,
				sandbox = helper.sandbox(function(error) {
					Code.expect(error.message).to.equal('No package.json');
					Code.expect(counter).to.equal(0);

					done();
				});

			sandbox(function() {
				var wanted = new Wanted();

				wanted.on('error', function() {
					++counter;
				});

				//  remove all handlers (including the error handler)
				wanted.off();

				wanted.check({path: __dirname + '/nope'});
			});
		});
	});

	path = __dirname + '/dummy_unhandled';

	lab.before(function(done) {
		helper.prepare(path, {
			dependencies: {
				polymorphic: '^1.0.0'
			},
			devDependencies: {
				blame: '^1.0.0'
			}
		}, done);
	});

	lab.after(function(done){
		helper.cleanup(path, done);
	});

	lab.experiment('Scope not in package.json', function() {
		lab.test('No error handler, throws error', function(done) {
			var scope = 'nope',
				sandbox = helper.sandbox(function(error) {
					Code.expect(error.message).to.equal('Scope not found: ' + scope);

					done();
				});

			sandbox(function() {
				var wanted = new Wanted();

				wanted.check({path: path, scope: scope});
			});
		});
	});

	lab.experiment('Not handling update event', function() {
		lab.test('no error handler, throws error', function(done) {
			var sandbox = helper.sandbox(function(error) {
					Code.expect(error.message).to.equal('Update needed: blame');

					done();
				});

			sandbox(function() {
				var wanted = new Wanted();

				wanted.check({path: path});
			});
		});

		lab.test('removed error handler, throws error', function(done) {
			var counter = 0,
				sandbox = helper.sandbox(function(error) {
					Code.expect(error.message).to.equal('Update needed: blame');
					Code.expect(counter).to.equal(0);

					done();
				});

			sandbox(function() {
				var wanted = new Wanted();

				//  attach the error handler
				wanted.on('error', function() {
					++counter;
				});

				//  remove the error handler
				wanted.off('error');

				wanted.check({path: path});
			});
		});

		lab.test('error handler, emits error', function(done) {
			var wanted = new Wanted();

			wanted.on('error', function(error) {
				Code.expect(error).to.equal('Update needed: blame');

				done();
			});

			wanted.check({path: path});
		});
	});

});
