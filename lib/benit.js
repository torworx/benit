module.exports = Benit;

var undef,
    slice = Array.prototype.slice,
    emptyFn = function () {};

var TEST_EVENTS_MAPPING = {
    'start': 'test start',
    'cycle start': 'cycle start',
    'cycle end': 'cycle end',
    'cycle complete': 'cycle',
    'complete': 'test'
};

function Benit(name, options) {
    if (!(this instanceof Benit)) {
        return new Benit(name);
    }
    EventEmitter.call(this);
    var self = this;
    this.name = name;
    this.options = extend({}, Benit.options, options || {});
    this.tests = [];

    function bindTestEvents(test) {
        Object.keys(TEST_EVENTS_MAPPING).forEach(function (e) {
            test.on(e, bound(self.emit, test, TEST_EVENTS_MAPPING[e]));
        });
        return test;
    }

    function tryrun(done) {
        var tests = self.tests, test, index = 0, error;
        function iterate () {
            if (index >= tests.length && !error) return nextTick(done);
            test = tests[index++];
            if (!test) return iterate();
            try {
                runTestFn(test, 1, iterate);
            } catch (e) {
                error = test.error = e;
                self.emit('error', e, test);
            }
            return null;
        };
        iterate();
    }

    extend(this, {

        add: function (name, options, fn) {
            if (typeof options === 'function') {
                fn = options;
                options = {};
            }
            var self = this;
            options = extend({}, self.options, options);
            self.tests.push(bindTestEvents(new Test(name, options, fn)));
            return self;
        },

        run: function () {
            var self = this;
            var tests = self.tests, test, completed = 0,
                args = slice.apply(arguments);

            tryrun(function () {
                args.push(iterate);
                self.emit('start');

                function iterate() {
                    if (completed >= tests.length) return complete();
                    test = tests[completed++];
                    if (!test) return iterate();
                    return test.run.apply(test, args);
                }

                function complete() {
                    self.emit('complete', self);
                }

                iterate();
            });

            return self;
        }

    });
}

Benit.options = {};
extend(Benit.options, {
    // Initial number of iterations
    initCount: 10
});

function runTestFn(test, count, done) {
    var fn = test.fn;
    if (fn.length > 0) {
        fn(count, done);
    } else {
        while (count--) fn();
        done();
    }
}

function Test(name, options, fn) {
    if (typeof options === 'function') {
        fn = options;
        options = {};
    }
    var test = this;
    options = extend({}, Benit.options, options);

    // Test instances get EventEmitter API
    EventEmitter.call(test);

    if (!fn) throw new Error('Undefined test function');
    if (typeof fn !== 'function') {
        throw new Error('"' + name + '" test: Invalid test function');
    }

    /**
     * Reset test state
     */
    function reset() {
        delete test.count;
        delete test.cycle;
        delete test.stats;
        delete test.running;
        test.emit('reset', test);
        return test;
    }

    function clone() {
        var test = extend(new Test(name, fn), test);
        return test.reset();
    }

    function run() {
        var count = undef, n = undef, done = undef, args, arg, stats, total = 0;
        args = Array.prototype.slice.apply(arguments);
        for (var i = 0; i < args.length; i++) {
            arg = args[i];
            if (done === undef && typeof arg === 'function') {
                done = arg;
            } else if (count === undef) {
                count = arg;
            } else if (n === undef) {
                n = arg;
            }
        }
        test.count = count = count || options.initCount;
        test.cycle= n = n || 1;
        test.stats = stats = {
            mean: NaN,
            max: 0,
            min: 1e9
        };
        if (typeof done !== 'function') done = emptyFn;

        test.emit('start', test);
        function iterate() {
            if (n--) return execute(count, function (elapse) {
                stats.max = Math.max(stats.max, elapse);
                stats.min = Math.min(stats.min, elapse);
                total += elapse;
                nextTick(iterate);
            });
            stats.mean = total / test.cycle;
            test.total = total;
            test.period = stats.mean / test.count;
            test.hz = sig(1000 / test.period, 4);
            test.emit('complete', test);
            return done(test);

        }
        iterate();
    }

    function execute(count, done) {
        test.running = true;
        var start, elapse;
        test.emit('cycle start', test);
        // Start the timer
        start = Date.now();
        runTestFn(test, count, function complete() {
            elapse = Date.now() - start;
            test.running = false;
            test.emit('cycle complete', test);
            done(elapse);
        });

        return test;
    }

    // Set properties that are specific to this instance
    extend(test, {
        // Test name
        name: name,
        // Test function
        fn: fn,

        clone: clone,
        run: run,
        reset: reset
    });

    // IE7 doesn't do 'toString' or 'toValue' in object enumerations, so set
    // it explicitely here.
    test.toString = function () {
        var self = this;
        if (self.stats) {
            return '{0}:   {1} ops/sec ({2} x {3} ops/ {4} ms)'.format(self.name, self.hz, self.count, self.cycle, self.total);
        } else {
            return '{0}:   {1} x {2} ops'.format(self.name, self.count, self.cycle);
        }
    };
}


// Node.js-inspired event emitter API, with some enhancements.
function EventEmitter() {
    var ee = this;
    var listeners = {};

    this.on = function (e, fn) {
        if (!listeners[e]) listeners[e] = [];
        listeners[e].push(fn);
        return this;
    };
    this.removeListener = function (e, fn) {
        listeners[e] = filter(listeners[e], function (l) {
            return l != fn;
        });
    };
    this.removeAllListeners = function (e) {
        listeners[e] = [];
    };
    this.emit = function (e) {
        var args = Array.prototype.slice.call(arguments, 1);
        forEach([].concat(listeners[e], listeners['*']), function (l) {
            ee._emitting = e;
            if (l) l.apply(ee, args);
        });
        delete ee._emitting;
        return this;
    };
}



// Copy properties
function extend(dst) {
    var sources = Array.prototype.slice.call(arguments, 1);
    var src;
    for (var i = 0; i < sources.length; i++) {
        src = sources[i];
        for (var k in src) if (src.hasOwnProperty(k)) {
            dst[k] = src[k];
        }
    }
    return dst;
}

function bound(fn, context) {
    var curriedArgs = Array.prototype.slice.call(arguments, 2);
    if (curriedArgs.length) {
        return function () {
            var allArgs = curriedArgs.slice(0);
            for (var i = 0, n = arguments.length; i < n; ++i) {
                allArgs.push(arguments[i]);
            }
            fn.apply(context, allArgs);
        };
    } else {
        return createProxy(fn, context);
    }
}

function createProxy(f, context) {
    return function () {
        f.apply(context, arguments);
    }
}

// Array: apply f to each item in a
function forEach(a, f) {
    for (var i = 0, il = (a && a.length); i < il; i++) {
        var o = a[i];
        f(o, i);
    }
}

// Array: return array of all results of f(item)
function map(a, f) {
    var i, il, o, res = [];
    for (i = 0, il = (a && a.length); i < il; i++) {
        o = a[i];
        res.push(f(o, i));
    }
    return res;
}

// Array: filter out items for which f(item) is falsy
function filter(a, f) {
    var i, il, o, res = [];
    for (i = 0, il = (a && a.length); i < il; i++) {
        o = a[i];
        if (f(o, i)) res.push(o);
    }
    return res;
}

// Round x to d significant digits
function sig(x, d) {
    var exp = Math.ceil(Math.log(Math.abs(x)) / Math.log(10)),
        f = Math.pow(10, exp - d);
    return Math.round(x / f) * f;
}

var nextTick;

// Prefer setImmediate or MessageChannel, cascade to node,
// vertx and finally setTimeout
/*global setImmediate,MessageChannel,process,vertx*/
if (typeof setImmediate === 'function') {
    nextTick = setImmediate.bind(global);
} else if(typeof MessageChannel !== 'undefined') {
    var channel = new MessageChannel();
    channel.port1.onmessage = drainQueue;
    nextTick = function() { channel.port2.postMessage(0); };
} else if (typeof process === 'object' && process.nextTick) {
    nextTick = process.nextTick;
} else if (typeof vertx === 'object') {
    nextTick = vertx.runOnLoop;
} else {
    nextTick = function(t) { setTimeout(t, 0); };
}

// First, checks if it isn't implemented yet.
if (!String.prototype.format) {
    String.prototype.format = function() {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function(match, number) {
            return typeof args[number] != 'undefined'
                ? args[number]
                : match
                ;
        });
    };
}