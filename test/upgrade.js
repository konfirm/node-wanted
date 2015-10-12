'use strict';

var Code = require('code'),
	Lab = require('lab'),
	Wanted = require('../lib/wanted'),
	helper = require('./helper'),
	lab = exports.lab = Lab.script(),
	path;

lab.experiment('Wanted - Upgrade', function() {
	path = __dirname + '/dummy_upgrade';

	lab.before(function(done) {
		helper.prepare(path, {
			dependencies: {
				polymorphic: '^1.0.0'
			},
			devDependencies: {
				blame: '~1.0.0',
				submerge: '^1.0.0'
			}
		}, done);
	});

	lab.after(function(done) {
		helper.cleanup(path, done);
	});

	lab.experiment('Install dependencies', function() {

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

		lab.test('Upgrade dependencies', function(done) {
			helper.write(path + '/package.json', {
				dependencies: {
					polymorphic: '^1.0.0'
				},
				devDependencies: {
					blame: '~1.1.0',    //  blame gets an dependency upgrade
					submerge: '^1.0.0'  //  submerge remains at the same revision
				}
			}, function() {
				var wanted = new Wanted();

				//  removed the require cache so we can actually upgrade
				//  the path needs to contain: 'test/dummy_upgrade'
				helper.purgeRequired('test/dummy_upgrade');

				wanted.on('ready', function(list) {
					Code.expect(list.length).to.equal(2);
					Code.expect(list.filter(function(module) {
						return module.installed;
					}).length).to.equal(2);
					Code.expect(list.filter(function(module) {
						return module.state === 'upgrade';
					}).length).to.equal(1);

					done();
				});


				wanted.on('install', function(module) {
					module.accept();
				});

				wanted.check({path: path});
			});
		});

		lab.test('Auto-upgrade dependencies', function(done) {
			helper.write(path + '/package.json', {
				dependencies: {
					polymorphic: '^1.0.0'
				},
				devDependencies: {
					blame: '~1.2.0',    //  blame gets an dependency upgrade
					submerge: '^1.0.0'  //  submerge remains at the same revision
				}
			}, function() {
				var wanted = new Wanted();

				//  removed the require cache so we can actually upgrade
				//  the path needs to contain: 'test/dummy_upgrade'
				helper.purgeRequired('test/dummy_upgrade');

				wanted.on('ready', function(list) {
					Code.expect(list.length).to.equal(2);
					Code.expect(list.filter(function(module) {
						return module.installed;
					}).length).to.equal(2);
					Code.expect(list.filter(function(module) {
						return module.state === 'upgrade';
					}).length).to.equal(1);

					done();
				});

				wanted.check({path: path, autoAccept: true});
			});
		});


		//  this test is actually performed on the 'blame: ^1.2.0' package.json
		lab.test('Dependencies up-to-date', function(done) {
			var install = 0,
				current = 0,
				wanted = new Wanted();

			//  removed the require cache so we can actually upgrade
			//  the path needs to contain: 'test/dummy_upgrade'
			helper.purgeRequired('test/dummy_upgrade');

			wanted.on('ready', function(list) {
				Code.expect(list.length).to.equal(2);
				Code.expect(list.filter(function(module) {
					return module.installed;
				}).length).to.equal(2);
				Code.expect(list.filter(function(module) {
					return module.upgrade;
				}).length).to.equal(0);

				done();
			});

			wanted.on('current', function() {
				++current;
			});

			wanted.on('install', function(module) {
				++install;
				module.accept();
			});

			wanted.check({path: path});
		});
	});

});
