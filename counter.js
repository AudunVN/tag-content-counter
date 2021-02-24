const { generateKeyPair } = require('crypto');
const fs = require('fs');
const path = require("path");
const json2html = require('node-json2html');

const DEBUG = false;
const pageTemplatePath = __dirname + "/template.html";
const saveInterval = 1 * 60000; /* one minute in ms */

let output = {
	startTime: Date.now(),
	lastSaveTime: Date.now(),
	isFinished: false,
	totalItemsChecked: 0,
	uniqueItems: 0,
	itemCounters: {}
};

const args = process.argv.slice(2);

const keyName = args[0].toUpperCase();
if (DEBUG) { console.log("Tag name: " + keyName); }

const inputPath = args[1];
if (DEBUG) { console.log("Input path: " + inputPath); }

const inputFileName = path.basename(inputPath);
const outputPath = __dirname + "/output/" + inputFileName;
if (DEBUG) { console.log("Output path: " + outputPath); }

function updateLine(line){
	process.stdout.clearLine();
	process.stdout.cursorTo(0);
	process.stdout.write(line);
}

function roughSizeOfObject(object) {
	let objectList = [];
	let stack = [object];
	let bytes = 0;
	
	while (stack.length) {
		let value = stack.pop();

		if (typeof value === 'boolean') {
			bytes += 4;
		}
		else if (typeof value === 'string') {
			bytes += value.length * 2;
		}
		else if (typeof value === 'number') {
			bytes += 8;
		}
		else if (
			typeof value === 'object'
			&& objectList.indexOf(value) === -1
		) {
			objectList.push(value);

			for(var i in value) {
				stack.push(value[i]);
			}
		}
	}
	return bytes;
}

function formatBytes(a,b=2){if(0===a)return"0 Bytes";const c=0>b?0:b,d=Math.floor(Math.log(a)/Math.log(1024));return parseFloat((a/Math.pow(1024,d)).toFixed(c))+" "+["Bytes","KB","MB","GB","TB","PB","EB","ZB","YB"][d]}

function saveOutputAsJson() {
	let outputString = JSON.stringify(output);

	console.log(" - Writing JSON file");

	fs.writeFileSync(outputPath + ".json", outputString, 'utf8');

	output.lastSaveTime = Date.now();
}

function writeWebPage(title, tableContents) {
	fs.readFile(pageTemplatePath, 'utf8', function (error, page) {
		if (error) {
			console.error(error); return;
		}

		let pageWithTitle = page.replace(/{%!TITLE!%}/g, title);
		let finishedPage = pageWithTitle.replace(/{%!TABLE-CONTENTS!%}/g, tableContents);

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
		output.totalItemsChecked++;

		if (output.totalItemsChecked % 5000 === 0) {
			if (Date.now() > output.lastSaveTime + saveInterval) {
				saveOutputAsJson();
			}
		}

		if (output.itemCounters.hasOwnProperty(text)) {
			output.itemCounters[text]++; 
		} else {
			output.itemCounters[text] = 1;

			output.uniqueItems++;

			if (DEBUG) { console.log("New name: " + text); }
			
			if (output.uniqueItems % 1000 === 0) {
				updateLine("Unique names:" + output.uniqueItems + " in " + formatBytes(roughSizeOfObject(output.itemCounters))); 
			}
		}

		insideTextTag = false;
	}
});

saxStream.on("end", function () {
	console.log('\nParsing finished.');

	output.isFinished = true;

	saveOutputAsJson(output);

	let itemCounters = Object.entries(output.itemCounters);

	let data = itemCounters.sort((a, b) => b[1] - a[1]);

	let outputData = data.slice(0, 100);

	let headerTemplate = {"<>":"thead","html":[
		{"<>":"tr","html":[
			{"<>":"td","text":"Name"},
			{"<>":"td","text":"Count"}
		]}
	]};

	let contentTemplate = {
		"row": {
			"<>":"tr","html": [
				{"<>":"td","text":"${0}"},
				{"<>":"td","text":"${1}"}
			]
		},
		"tableBody": {
			"<>":"tbody",'html': function() {
				return json2html.transform(outputData, contentTemplate.row);
			}
		}
	};

	console.log("Writing HTML file");

	let tableContentHtml = json2html.transform({}, headerTemplate) + json2html.transform({}, contentTemplate.tableBody);

	writeWebPage(inputFileName, tableContentHtml);

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
