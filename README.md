benit
=====

A simple, easy, javascript benchmarking library.

## Example
```js

var benit = Benit('String Match Benchmark');

// add tests
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
    .on('cycle', function (test) {
        console.log(test.toString());
    })
    .on('complete', function () {
        console.log('------------------------------------------------------------');
    })
    .run(100000);
```
Outputs:
```
============================================================
String Match Benchmark
------------------------------------------------------------
RegExp#test x 6667000 ops/sec (100000 ops/ 15 ms)
String#indexOf x 14290000 ops/sec (100000 ops/ 7 ms)
String#match x 6250000 ops/sec (100000 ops/ 16 ms)
------------------------------------------------------------
```

