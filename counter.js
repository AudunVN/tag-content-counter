const { generateKeyPair } = require('crypto');
const fs = require('fs');
const path = require("path");
const json2html = require('node-json2html');

const names = [];
const DEBUG = false;

const pageTemplatePath = __dirname + "/template.html";

const args = process.argv.slice(2);

const keyName = args[0].toUpperCase();
if (DEBUG) { console.log("Tag name: " + keyName); }

const inputPath = args[1];
if (DEBUG) { console.log("Input path: " + text); }

const inputFileName = path.basename(inputPath);
const outputPath = __dirname + "/output/" + inputFileName;
if (DEBUG) { console.log("Output path: " + outputPath); }

function updateLine(line){
	process.stdout.clearLine();
	process.stdout.cursorTo(0);
	process.stdout.write(line);
}

function writeWebPage(title, contents) {
	fs.readFile(pageTemplatePath, 'utf8', function (error, page) {
		if (error) {
			console.error(error); return;
		}

		let pageWithTitle = page.replace(/{%!TITLE!%}/g, title);
		let finishedPage = pageWithTitle.replace(/{%!MAIN-CONTENTS!%}/g, contents);

		fs.writeFileSync(outputPath + ".html", finishedPage, 'utf8');
	});
}

let isStrict = false;
let saxStream = require("sax").createStream(isStrict, { trim: true });

let insideTextTag = false;

saxStream.on("opentag", function (tag) {
	if (tag.name == keyName) {
		insideTextTag = true;
	}
});

saxStream.on("text", function (text) {
	if (insideTextTag) {
		const nameIndex = names.findIndex(name => name.name === text);

		if (nameIndex !== -1) {
			names[nameIndex].count++; 
		} else {
			if (DEBUG) { console.log("New name: " + text); }
			updateLine("Unique names: " + names.length);
			names.push({ name: text , count: 1 });
		}

		insideTextTag = false;
	}
});

saxStream.on("end", function () {
	console.log('\nParsing finished.');

	let data = names.sort((a, b) => b.count - a.count);

	let outputString = JSON.stringify(data);
	fs.writeFileSync(outputPath + ".json", outputString, 'utf8');

	let contentTemplate = {
		"row": {
			"<>":"tr","html": [
				{"<>":"td","text":"${name}"},
				{"<>":"td","text":"${count}"}
			]
		},
		"table": {
			"<>":"table","html":[
				{"<>":"thead","html":[
					{"<>":"tr","html":[
						{"<>":"td","text":"Name"},
						{"<>":"td","text":"Count"}
					]}
				]},
				{"<>":"tbody",'html': function(){
					return json2html.transform(data, contentTemplate.row);    
				}}
			]
		}
	};

	let outputHtml = json2html.transform({}, contentTemplate.table);
	writeWebPage(inputFileName, outputHtml);

	console.log('Results written to ' + outputPath);
});

saxStream.on("error", function (e) {
	console.error(error)

	this._parser.error = null;
	this._parser.resume();
});

if (!inputPath.endsWith(".zip"))  {
	fs.createReadStream(inputPath).pipe(saxStream);
} else {
	const StreamZip = require('node-stream-zip');
	const zip = new StreamZip({ file: inputPath });
	
	zip.on('error', error => { console.log(error) });
	
	zip.on('ready', () => {
		let file = { size: 0 };

		console.log('Entries read: ' + zip.entriesCount);
		for (const entry of Object.values(zip.entries())) {
			const desc = entry.isDirectory ? 'directory' : `${entry.size} bytes`;
			console.log(`Entry ${entry.name}: ${desc}`);
			if (entry.size > file.size) {
				file = entry;
			}
		}

		console.log(`Reading from ${file.name}`);

		console.log("Starting stream");

		zip.stream(file.name, (error, stream) => {
			stream.pipe(saxStream);
			stream.on('end', () => zip.close());
		});
	});
}
