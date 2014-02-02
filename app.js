#! /usr/bin/env node

/* External Dependencies
  -libtiff
  -libexif
  -exiv2
*/

/* Known Issues
  -*.tif files aren't parseable, no idea why
  +because libexif doesn't do it, added exiv2 parsing 
*/

var colors = require('colors')
  , mkdirp = require('mkdirp')
  , util = require('util')
  , path = require('path')
  , exif = require('libexif')
  , uuid = require('node-uuid')
  , parser = require('exif-parser')
  , fs = require('fs')
  , Q = require('q')
  , _ = require('lodash');

// // Clear Console Trick
util.print("\u001b[2J\u001b[0;0H");

// Application Title
console.log('Node Image Data Extractor'.bold.white.inverse);

// Command Line Parameters
var argv = require('optimist')
    .usage('Extracts exif data from files in provided \nfolder to csv, json or individual text files.')
    .demand('d')
    .alias('d', 'dir')
    .describe('d', 'Directory containing image files')
    .argv;

// File Helper Functions
var helper = {
  isValidFile: function(filename) {
    var ext = filename.split('.').pop();
    return _.contains(['jpg', 'jpeg', 'tif', 'tiff', 'png'], ext);
  },
  fileName: function(filename) {
    return filename.split('.')[0];
  },
  getLibExif: function(file) {
    var deferred = Q.defer();

    try {
      deferred.resolve(exif.parse(file));
    } catch(err) {
      deferred.reject(new Error(err));
    }

    return deferred.promise;
  },
  getParseExif: function(file) {
    var deferred = Q.defer()
      , buff = new Buffer(65635);
    
    // Read 65635 Bytes File
    fs.open(file, 'r', function(err, fd) {
      if(err) deferred.reject(new Error(err));
      fs.read(fd, buff, 0, 65635, 0, function(err, bytesRead, buffer) {
        if(err) deferred.reject(new Error(err));

        try {
          var block = parser.create(buff);
          deferred.resolve(block.parse());
        } catch(parseerror) {
          deferred.reject(new Error(parseerror));
        }
        
      });
    });

    return deferred.promise;
  },
  getCliExiv : function(file) {
    var deferred = Q.defer()
      , exec = require('child_process').exec;

    exec('exiv2 -pt '+file, function (error, stdout, stderr) {
      if (error !== null) {
        deferred.reject(new Error(error));
      }
      deferred.resolve(stdout);
    });

    return deferred.promise;
  },
  parseCliExiv: function(input) {
    var retObj = {};
    var lines = input.split('\n');
    var uniq = uuid.v1();
    for(var i = 0; i < lines.length; i++) {
      var line = lines[i].replace(/\s{2,}/g, uniq).split(uniq);
      retObj[line[0].split('.').pop()] = line[3];
    }
    return retObj;
  },
  promiseExif: function(file, dir, name) {
    var deferred = Q.defer();

    // can use one of the three exif functions
    helper.getLibExif(file).then(function(exifdata) {
      fs.writeFile(path.join(dir, name+'.json'), JSON.stringify(exifdata), function(err) {
        if(err) {
          deferred.reject(new Error(err));
        } else {
          deferred.resolve({ file: path.join(dir, name+'.json') });
        }
      });
    }, function(err) {
      deferred.reject(new Error(err));
    });

    return deferred.promise;
  }
};

// Main Worker
fs.readdir(argv.dir, function(err, files) {
  if (err) { console.log(err.message); return; }

  _.each(files, function(item, index, list) {

    var filepath = path.join(argv.dir + '/' + item);

    fs.stat(filepath, function(err, stats) {
      if (err) { console.log(err.message); return; }

      if(stats.isFile() && helper.isValidFile(item)) {

        helper.promiseExif(filepath, argv.dir,helper.fileName(item))
          .then(function() {
            console.log("File: ".bold.white + "%s".green + " parsed.", item);
          }, function(err) {
            console.log("File: ".bold.white + "%s".red + " not parsed because: " + "%s".red, item, err.message);
            helper.getCliExiv(filepath)
              .then(function(data) {
                fs.writeFile(path.join(argv.dir, helper.fileName(item)+'.json'), JSON.stringify(helper.parseCliExiv(data)), function(err) {
                  if (err) { console.log(err.message); return; }
                  console.log("File: ".bold.white + "%s".green + " parsed anyway.", item);
                });
              });
          });

      } // if(isFile & Valid Extension)

    }); // fs.stat cb

  }); // each item in directory

}); // read directory
