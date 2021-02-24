# tag-content-counter
Counts occurences of tag contents in an XML file. Useful for seeing how often a place name or similar occurs in a GML file. If a zip file is specified as input, the script will try parse the largest file in the archive.

Output files are stored in `/output` with the same file name as the input file, but with `.json` or `.html` added at the end. The HTML file only includes the first 1000 rows, the rest are loaded by DataTables from the `.json` file if JavaScript is enabled.

## Usage
node counter.js "tagname without brackets" "input file" "optional title" "optional description"

### Examples
```bash
node counter.js "gn:text" "input/inspire-gn.gml" 
```
Outputs `.json` and `.html` files with tag content counts for `inspire-gn.gml`. The title will be generated from the tag and input file name.
```bash
node counter.js "gn:text" "input/inspire-gn.zip" "Place Name Frequency in Norway"
```
Outputs `.json` and `.html` files with tag content counts for `inspire-gn.zip`. The title will be set to `Place Name Frequency in Norway`.

```bash
node counter.js "gn:text" "input/inspire-gn.zip" "Place Name Frequency in Norway" "Shows the amount of times place names are used in Norway's INSPIRE place name data set. Data from Kartverket."
```
Outputs `.json` and `.html` files with tag content counts for `inspire-gn.zip`. A title and description will be added.

## Current data
```bash
node counter.js "app:langnavn" "C:\Users\Space\Downloads\Basisdata_0000_Norge_25833_StedsnavnKomplettSSR_GML.zip" "Place Name Frequency in Norway" "Shows the amount of times all official place names in Norway are used. Data from Kartverket."
```
Complete place name frequencies for Norway. [Available here](http://471.no/tag-content-counter/output/Basisdata_0000_Norge_25833_StedsnavnKomplettSSR_GML.zip.html).

```bash
node counter.js "app:adressenavn" "C:\Users\Space\Downloads\Basisdata_0000_Norge_4258_MatrikkelenVegadresse_GML.zip" "Address Street Name Frequency in Norway" "Shows the amount of addresses per street name in Norway. Data from Kartverket."
```
Complete address street name frequencies for Norway. [Available here](https://471.no/tag-content-counter/output/Basisdata_0000_Norge_4258_MatrikkelenVegadresse_GML.zip.html).
