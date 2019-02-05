const fs = require('fs');
module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        version: '3.2.',
        karma: {
            telemetryV3: {
                configFile: './test/karma.renderer.config.js',
            },
            telemetryFunV3: {
                configFile: './test/karma.telemetry.fun.config.js',
            }

        },
        concat: {
            telemetryLib: {
                src: [
                    './libs/ajv.min.js',
                    './schema/telemetry-spec.js',
                    './libs/detectClient.js',
                    './libs/md5.js',
                    './libs/ua-parser.min.js',
                    './libs/fingerprint2.min.js',
                    './core/telemetrySyncManager.js',
                    './core/telemetryV3Interface.js'
                ],
                dest: './dist/index.js'
            }
        },
        uglify: {
            authtokengenerator: {
                options: {
                    mangle: false
                },
                files: {
                    './core/auth-token-generator.min.js': ['./core/auth-token-generator/auth-token-generator.js']
                }
            }
        }
    });
    grunt.loadNpmTasks('grunt-karma');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.registerTask('build-telemetry-lib', ['concat:telemetryLib', "uglify:authtokengenerator"]);
    grunt.registerTask('renderer-telemetryV3', ['karma:telemetryV3']);
    grunt.registerTask('telemetry-lib-test', ['karma:telemetryFunV3']);

};