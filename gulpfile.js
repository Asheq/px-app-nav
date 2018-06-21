/**
 * @license
 * Copyright (c) 2018, General Electric
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';
const path = require('path');
const gulp = require('gulp');
const pkg = require('./package.json');
const $ = require('gulp-load-plugins')();
const gulpSequence = require('gulp-sequence');
const importOnce = require('node-sass-import-once');
const stylemod = require('gulp-style-modules');
const browserSync = require('browser-sync').create();
const gulpif = require('gulp-if');
const combiner = require('stream-combiner2');
const bump = require('gulp-bump');
const argv = require('yargs').argv;
const exec = require('child_process').exec;
const { ensureLicense } = require('ensure-px-license');

const sassOptions = {
  importer: importOnce,
  importOnce: {
    index: true,
    bower: true
  }
};

gulp.task('clean', function() {
  return gulp.src(['.tmp', 'css'], { read: false })
    .pipe($.clean());
});

function handleError(err) {
  console.log(err.toString());
  this.emit('end');
}

function buildCSS() {
  return combiner.obj([
    $.sass(sassOptions),
    $.autoprefixer({
      browsers: ['last 2 versions'],
      cascade: false,
      flexbox: false
    }),
    gulpif(!argv.debug, $.cssmin())
  ]).on('error', handleError);
}

gulp.task('sass', function() {
  return gulp.src(['./sass/*.scss'])
    .pipe(buildCSS())
    .pipe(stylemod({
      moduleId(file) {
        return path.basename(file.path, path.extname(file.path)) + '-styles';
      }
    }))
    .pipe(ensureLicense())
    .pipe(gulp.dest('css'))
    .pipe(browserSync.stream({ match: 'css/*.html' }));
});

gulp.task('watch', function() {
  gulp.watch(['sass/*.scss'], ['sass']);
});

gulp.task('serve', function() {
  browserSync.init({
    port: 8080,
    logPrefix: `${pkg.name}`,
    https: false,
    server: ['./', 'bower_components'],
    reloadOnRestart: false,
    watch: false,
    notify: false,
    reloadDebounce: 500000000, // disable!
    reloadDelay: 500000000, // disable!
    ui: false,
  });

  gulp.watch(['css/*-styles.html', '*.html', '*.js', 'demo/*.html']).on('change', browserSync.reload);
  gulp.watch(['sass/*.scss'], ['sass']);
});

gulp.task('bump:patch', function() {
  gulp.src(['./bower.json', './package.json'])
    .pipe(bump({ type: 'patch' }))
    .pipe(gulp.dest('./'));
});

gulp.task('bump:minor', function() {
  gulp.src(['./bower.json', './package.json'])
    .pipe(bump({ type: 'minor' }))
    .pipe(gulp.dest('./'));
});

gulp.task('bump:major', function() {
  gulp.src(['./bower.json', './package.json'])
    .pipe(bump({ type: 'major' }))
    .pipe(gulp.dest('./'));
});

gulp.task('license', function() {
  return gulp.src(['./**/*.{html,js,css,scss}', '!./node_modules/**/*', '!./bower_components?(-1.x)/**/*'])
    .pipe(ensureLicense())
    .pipe(gulp.dest('.'));
});

gulp.task('default', function(callback) {
  gulpSequence('clean', 'sass', 'generate-api', 'license')(callback);
});

/**
 * Special task for Polymer component repos. Analyzes the component source code
 * and generates documentation in `[component-name]-api.json`.
 */
gulp.task('generate-api', function (cb) {
  exec(`node_modules/.bin/polymer analyze ${pkg.name}.html > ${pkg.name}-api.json`, function(err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
});
