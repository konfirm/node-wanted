'use strict';

var Code = require('code'),
	Lab = require('lab'),
	Wanted = require('../lib/wanted'),
	helper = require('./helper'),
	lab = exports.lab = Lab.script(),
	moduleName = 'we-hope-no-one-creates-a-module-with-this-name-as-it-would-break-the-unit-test',
	path;

function freshRequire(file) {
	if (file in require.cache) {
		delete require.cache[file];
	}

	return require(file);
}

lab.experiment('Wanted - Unknown', function() {
	path = process.cwd() + '/node_modules/';

	lab.after(function(done) {
		helper.cleanup(path + 'blame', function() {
			helper.cleanup(path + moduleName, done);
		});
	});

	lab.experiment('Install requirements', function() {
		lab.test('Require an unknown module', {timeout: 15000}, function(done) {
			var wanted = new Wanted(),
				blame = wanted.require('blame');

			//  we expect the blame module to exist and be the (version agnostic) module we wanted
			Code.expect('stack' in blame).to.equal(true);
			Code.expect(typeof blame.stack).to.equal('function');

			done();
		});

		lab.test('Require the now known module, but a different version', {timeout: 15000}, function(done) {
			var wanted = new Wanted(),
				module = {
					name: 'blame',
					version: '1.0.0'
				},
				blame = wanted.require(module),
				json = freshRequire(process.cwd() + '/node_modules/blame/package.json');

			//  we expect the blame module to exist and be the (version agnostic) module we wanted
			Code.expect('stack' in blame).to.equal(true);
			Code.expect(typeof blame.stack).to.equal('function');
			Code.expect(json.version).to.equal(module.version);

			done();
		});

		lab.test('Require the now known module, with a matching semver version', {timeout: 15000}, function(done) {
			var wanted = new Wanted(),
				module = {
					name: 'blame',
					version: '^1.0.0'
				},
				blame = wanted.require(module),
				json = freshRequire(process.cwd() + '/node_modules/blame/package.json');

			//  we expect the blame module to exist and be the (version agnostic) module we wanted
			Code.expect('stack' in blame).to.equal(true);
			Code.expect(typeof blame.stack).to.equal('function');
			Code.expect(json.version).to.equal('1.0.0');

			done();
		});

		lab.test('Require a known module, but a different version', {timeout: 15000}, function(done) {
			var wanted = new Wanted(),
				module = {
					name: 'submerge',
					version: '0.0.1'
				},
				submerge = wanted.require(module),
				json = freshRequire(process.cwd() + '/node_modules/submerge/package.json');

			//  we expect the submerge module to exist and be the (version agnostic) module we wanted
			Code.expect('live' in submerge).to.equal(true);
			Code.expect(typeof submerge.live).to.equal('function');
			Code.expect(json.version).to.equal(module.version);

			done();
		});

		lab.test('Require a known module, (restore) the configured version', {timeout: 15000}, function(done) {
			var wanted = new Wanted(),
				submerge = wanted.require({
					name: 'submerge'
				}),
				json = freshRequire(process.cwd() + '/node_modules/submerge/package.json');

			//  we expect the submerge module to exist and be the (version agnostic) module we wanted
			Code.expect('live' in submerge).to.equal(true);
			Code.expect(typeof submerge.live).to.equal('function');
			Code.expect(json.version).to.not.equal('0.0.1');

			done();
		});

		lab.test('Require an unknown module', {timeout: 15000}, function(done) {
			var counter = 0,
				wanted = new Wanted(),
				error, unknown;

			try {
				unknown = wanted.require(moduleName);
			}
			catch (e) {
				++counter;
				error = e;
			}

			//  we expect to have recieved an error
			Code.expect(error.message).to.equal('Failed to install: ' + moduleName);
			Code.expect(counter).to.equal(1);

			done();
		});
	});

	lab.experiment('Install version specific requirements', function() {
		lab.test('Require an unknown module', {timeout: 15000}, function(done) {
			var wanted = new Wanted(),
				blame = wanted.require('blame');

			//  we expect the blame module to exist and be the (version agnostic) module we wanted
			Code.expect('stack' in blame).to.equal(true);
			Code.expect(typeof blame.stack).to.equal('function');

			done();
		});

		lab.test('Require the (implicit) latest version', {timeout: 15000}, function(done) {
			var wanted = new Wanted(),
				blame = wanted.require('blame', true);

			//  we expect the blame module to exist and be the (version agnostic) module we wanted
			Code.expect('stack' in blame).to.equal(true);
			Code.expect(typeof blame.stack).to.equal('function');

			done();
		});
	});

});
