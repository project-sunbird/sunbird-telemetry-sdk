/**
 * Karma Jasmine test setup
 * @author Akash Gupta <akash.gupta@tarento.com>
 */

module.exports = function(config) {
    config.set({
        basePath: '',
        frameworks: [
            'jasmine-jquery',
            'jasmine',
            'jasmine-matchers'
        ],
        files: [{ pattern: 'http-image/**/*', watched: false, included: false, served: true },
            "./node_modules/jquery/dist/jquery.min.js",
            "./libs/ajv.min.js",
            "./libs/fingerprint2.min.js",
            './schema/telemetry-spec.js',
            './libs/md5.js',
            './core/telemetryV3Interface.js',
            './core/telemetrySyncManager.js',
            './test/spec/telemetryV3Interface.spec.js',
            //'./spec/telemetrySyncManager.spec.js',

        ],
        exclude: ['coverage'],
        preprocessors: {
            './core/telemetryV3Interface.js': ['coverage'],
            './core/telemetrySyncManager.js': ['coverage']
        },
        reporters: ['verbose', 'progress', 'coverage'],
        mochaReporter: {
            colors: {
                success: 'green',
                info: 'bgYellow',
                warning: 'cyan',
                error: 'bgRed'
            },
            symbols: {
                success: '✔',
                info: '#',
                warning: '!',
                error: 'x'
            }
        },
        junitReporter: {
            outputDir: 'coverage',
            outputFile: 'test-results.xml',
        },
        coverageReporter: {
            reporters: [{ type: 'lcov' }]
        },

        plugins: [
            "karma-phantomjs-launcher",
            "@metahub/karma-jasmine-jquery",
            "karma-jasmine",
            "karma-jasmine-matchers",
            "karma-junit-reporter",
            'karma-coverage',
            "karma-ng-html2js-preprocessor",
            "karma-verbose-reporter",
            "karma-mocha-reporter"
        ],

        proxies: { 'http-image': '/base/player/public/js/test' },
        port: 8081,
        colors: true,
        logLevel: config.LOG_INFO,
        autoWatch: false,
        client: { captureConsole: false },
        browsers: ['PhantomJS'],
        singleRun: true,
        browserNoActivityTimeout: 3000
    })
}