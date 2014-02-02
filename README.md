# Node Exif Data Extractor
Command line utility for storing exif data from various formats (including `tiff`) in the same directory in `.json` format.

## Dependencies
The application has the following dependencies that need to be installed (only tested on Mac OSX 10.9)

- libexif
- exiv2

## Example
After running `npm install` in the cloned source you can run the app with `./app.js`. The app will give you directions on what parameters to provide.

## Todo
I want a bit more functionality including the following:

* The ability to provide output format with a cli argument (csv, txt, json, html)
* More structured & universal JSON output with standardized keys (when `libexiv` fails `exiv2` takes over and keys are different.
