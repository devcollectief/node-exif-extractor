# Node Exif Data Extractor
Command line utility for storing exif data from various formats (including `tiff`) in the same directory in `.json` format.

## Versions

-0.0.1 First set of functionality define folder, search for images and push found exif data to jsons
-0.0.2 Second set of functionality
  * Added argument to export to csv data ready for Adobe inDesign (Generate Overview Sheets)

## Dependencies
The application has the following dependencies that need to be installed (only tested on Mac OSX 10.9)

- libexif
- exiv2

## Example
After running `npm install` in the cloned source you can run the app with `./app.js`. The app will give you directions on what parameters to provide.

## Todo
I want a bit more functionality including the following:

* The ability to provide output format with a cli argument (txt, html)
* More structured & universal JSON output with standardized keys (when `libexiv` fails `exiv2` takes over and keys are different.
* Might make exiv2 default, it's proving to be superior.
* CLI argument to specify parameters to send to csv
