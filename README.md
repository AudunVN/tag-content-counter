# tag-content-counter
Counts occurences of tag contents in an XML file. Useful for seeing how often a place name or similar occurs in a GML file. If a zip file is specified as input, the script will try parse the largest file in the archive.

## Usage
node counter.js "tagname without brackets" "input file" 
node counter.js "gn:text" "inspire-gn.gml"
node counter.js "gn:text" "inspire-gn.zip"
node counter.js "app:langnavn" "Basisdata_0000_Norge_25833_StedsnavnKomplettSSR_GML.zip"
node counter.js "app:komplettskrivemåte" "Basisdata_0000_Norge_25833_Stedsnavn_GML.zip"