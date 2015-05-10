'use strict';

var Code = require('code'),
	Lab = require('lab'),
	Wanted = require('../lib/wanted'),
	helper = require('./helper'),
	lab = exports.lab = Lab.script(),
	path;

lab.experiment('Wanted - Accepted', function() {
	path = __dirname + '/dummy_accept';

	lab.before(function(done) {
		helper.prepare(path, {
			dependencies: {
				polymorphic: '^1.0.0'
			},
			devDependencies: {
				blame: '^1.0.0',
				submerge: '^1.0.0'
			}
		}, done);
	});

	lab.after(function(done) {
		helper.cleanup(path, done);
	});


	lab.experiment('Accepting update events', function() {

		lab.test('ready handler', {timeout: 5000}, function(done) {
			var wanted = new Wanted();

			wanted.on('ready', function(list) {
				Code.expect(list.length).to.equal(2);
				Code.expect(list.filter(function(module) {
					return module.installed;
				}).length).to.equal(2);

				done();
			});

			wanted.on('install', function(module) {
				module.accept();
			});

			wanted.check({path: path});
		});
	});

});
