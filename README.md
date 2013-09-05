# benit
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
    .on('test', function (test) {
        console.log(test.toString());
    })
    .on('complete', function () {
        console.log('------------------------------------------------------------');
    })
    // 100000 times, 20 cycles
    .run(100000, 20);
```
Outputs:
```
============================================================
String Match Benchmark
------------------------------------------------------------
RegExp#test:   10470000 ops/sec (100000 x 20 ops/ 191 ms)
String#indexOf:   18520000 ops/sec (100000 x 20 ops/ 108 ms)
String#match:   9009000 ops/sec (100000 x 20 ops/ 222 ms)
------------------------------------------------------------
```

