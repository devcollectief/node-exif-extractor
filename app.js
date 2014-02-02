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
    .alias('o', 'output')
    .describe('o', 'Output file type')
    .default('o','json')
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
  promiseJsonExif: function(file, dir, name) {
    var deferred = Q.defer();

    // Try with libexif First
    helper.getLibExif(file).then(function(exifdata) {
      fs.writeFile(path.join(dir, name+'.json'), JSON.stringify(exifdata), function(err) {
        if(err) deferred.reject(new Error(err));
    
        deferred.resolve({ file: path.join(dir, name+'.json') });
        
      });
    }, function() {

      // Try Again With Exiv2
      helper.getCliExiv(file)
        .then(function(data) {
          fs.writeFile(path.join(argv.dir, name+'.json'), JSON.stringify(helper.parseCliExiv(data)), function(err) {
            if (err) deferred.reject(new Error(err));

            deferred.resolve({ file: path.join(dir, name+'.json') });

          });
        });

    });

    return deferred.promise;
  },
  promiseCsvExif: function(file, dir, name) {
    var deferred = Q.defer()
      , ext = file.split('.').pop();

      helper.getCliExiv(file)
        .then(function(data) {
          deferred.resolve(data);
        });

    return deferred.promise;
  },
  writeJsonFiles: function(imgdir) {
    // Main Worker
    fs.readdir(imgdir, function(err, files) {
      if (err) { console.log(err.message); return; }

      _.each(files, function(item, index, list) {

        var filepath = path.join(imgdir + '/' + item);

        fs.stat(filepath, function(err, stats) {
          if (err) { console.log(err.message); return; }

          if(stats.isFile() && helper.isValidFile(item)) {

            helper.promiseJsonExif(filepath, imgdir, helper.fileName(item))
              .then(function() {
                console.log("File: ".bold.white + "%s".green + " parsed.", item);
              }, function(err) {
                console.log("File: ".bold.white + "%s".red + " not parsed because: " + "%s".red, item, err.message);
              });

          } // if(isFile & Valid Extension)

        }); // fs.stat cb

      }); // each item in directory

    }); // read directory
  },
  writeCsvData: function(imgdir, outfile, keys) {

    // Create Writestream
    var ws = fs.createWriteStream(path.join(imgdir, outfile))
      , ctr = 0;

    // Main Worker
    fs.readdir(imgdir, function(err, files) {
      if (err) { console.log(err.message); return; }

      _.each(files, function(item, index, list) {

        var filepath = path.join(imgdir + '/' + item);

        fs.stat(filepath, function(err, stats) {
          if (err) { console.log(err.message); return; }

          if(stats.isFile() && helper.isValidFile(item)) {

            helper.getCliExiv(filepath)
              .then(function(data) {
                var parsedData = helper.parseCliExiv(data);
                console.log("File: ".bold.white + "%s".green + " parsed and added to csv.", item);
                ws.write(filepath+','+helper.getFields(keys, parsedData)+'\n');
                ctr++;
              });
            
          } // if(isFile & Valid Extension)

        }); // fs.stat cb

        if(ctr === files.length)
          ws.end();

      }); // each item in directory

    }); // read directory

  },
  getFields: function(keys, data) {
    var ret = '';
    for(var i = 0; i < keys.length; i++) {
      ret += '"'+data[keys[i]]+'",';
    }
    return ret.replace(/,+$/, "");
  }
};

if(argv.output === 'json') {
  helper.writeJsonFiles(argv.dir);
} else {
  helper.writeCsvData(argv.dir, 'metadata.csv', argv._);
}
