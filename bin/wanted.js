#!/usr/bin/env node
'use strict';

var Wanted = require('../lib/wanted'),
	arg = require('minimist')(process.argv.slice(2)),
	wanted = new Wanted(),
	translate = {
		complete: '  automatic update',
		current:  '        up to date',
		install:  'needs installation',
		upgrade:  '     needs upgrade'
	},
	config = {
		scope: 'devDependencies',
		autoAccept: false
	};

if (arg.scope) {
	config.scope = arg.scope;
}

if (arg.auto) {
	config.autoAccept = arg.auto;
}

wanted.on('ready', function(state) {
	var report = {},
		upgrade = false;

	state.forEach(function(module) {
		if (module.installed === true) {
			module.state = 'complete';
		}

		if (!(module.state in report)) {
			report[module.state] = [];
		}

		report[module.state].push(module);
	});

	console.log('Wanted ready');
	['current', 'complete', 'install', 'upgrade'].forEach(function(state) {
		if (state in report) {
			upgrade = upgrade || state === 'upgrade';

			console.log(' %s: %d (%s)', state in translate ? translate[state] : state, report[state].length, report[state].map(function(module) {
				return module.name;
			}).join(', '));
		}
	});

	if (upgrade) {
		console.log('\nThere are packages in need of an upgrade, please run:');
		console.log('  npm update');
		console.log('  or');
		console.log('  ' + process.argv.join(' ') + ' --auto');
	}
});

wanted.check(config);
