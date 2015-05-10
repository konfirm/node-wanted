'use strict';

var Code = require('code'),
	Lab = require('lab'),
	Wanted = require('../lib/wanted'),
	helper = require('./helper'),
	lab = exports.lab = Lab.script(),
	path;

lab.experiment('Wanted - Unknown', function() {
	path = __dirname + '/dummy_unknown';

	lab.before(function(done) {
		helper.prepare(path, {
			dependencies: {
				polymorphic: '^1.0.0'
			},
			devDependencies: {
				nameokpackagedoesnotexist: '^0.0.0'
			}
		}, done);
	});

	lab.after(function(done){
		helper.cleanup(path, done);
	});

	lab.experiment('Install "nameokpackagedoesnotexist"', function() {

		lab.test('Error, twice', {timeout: 5000}, function(done) {
			var counter = 0,
				wanted = new Wanted();

			wanted.on('ready', function(list) {
				console.log('this is not reached', list);
			});

			wanted.on('error', function(error) {
				if (++counter > 1) {
					Code.expect(error).to.equal('Update needed: nameokpackagedoesnotexist');

					done();
				}
				else {
					Code.expect(error).to.equal('Failed to install: nameokpackagedoesnotexist');
				}
			});

			wanted.on('install', function(module) {
				module.accept();
			});

			wanted.check({path:path});
		});
	});

});
