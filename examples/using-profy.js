var Benit = require('../');
var ProfyTime = require('profy/time');

var benit = Benit('String Match Benchmark');

benit
    .add('RegExp#test', function () {
        return /o/.test('Hello World!');
    })
    .add('String#indexOf', function () {
        return 'Hello World!'.indexOf('o') > -1;
    })
    .add('String#match', function () {
        return !!'Hello World!'.match(/o/);
    })
    .on('start', function () {
        console.log('============================================================');
        console.log(this.name);
        console.log('------------------------------------------------------------');
    })
    .on('test start', function (test) {
        test.diffs = [];
        test.totals = [];
    })
    .on('cycle start', function (test) {
        test.perf = new ProfyTime();
        test.perf.start();
        test.perf.log('Start');
    })
    .on('cycle', function (test) {
        var perfFinishIndex = test.perf.log('Finish');
        test.perf.stop();
        test.diffs.push(test.perf.get(perfFinishIndex));
        var result = test.perf.result();
        test.totals.push(result.stats.total);
    })
    .on('test', function (test) {
        test.stats = test.diffs.reduce(function (stats, diff, index, array) {
            var value = diff.diff / 1000;
            stats.mean = (stats.mean || 0) + value;
            if (index === array.length - 1) {
                stats.mean = stats.mean / array.length;
            }
            stats.max = Math.max(stats.max || 0, value);
            stats.min = Math.min(stats.min || 1e9, value);
            return stats;
        }, {});

        console.log(test.name + ': ' + Math.floor(test.count * 1000 / test.stats.mean) + ' ops/sec');
        console.log(test.toString())
    })
    .on('complete', function () {
        console.log('------------------------------------------------------------');
    })
    .run(100000, 20);