const fs = require('fs');
const path = require("path");
const json2html = require('node-json2html');

const DEBUG = false;
const pageTemplatePath = __dirname + "/template.html";
const saveInterval = 1 * 60000; /* one minute in ms */

const args = process.argv.slice(2);

const keyName = args[0].toUpperCase();
if (DEBUG) { console.log("Tag name: " + keyName); }

const inputPath = args[1];
if (DEBUG) { console.log("Input path: " + inputPath); }

const inputFileName = path.basename(inputPath);
const outputPath = __dirname + "/output/" + inputFileName;
if (DEBUG) { console.log("Output path: " + outputPath); }

let output = {
	input: inputFileName,
	title: null,
	description: null,
	tag: keyName,
	startTime: Date.now(),
	lastSaveTime: Date.now(),
	isFinished: false,
	totalTagsChecked: 0,
	uniqueTagContents: 0,
	counters: {}
};

if (typeof args[2] !== 'undefined') {
	output.title = args[2];
	if (DEBUG) { console.log("Title: " + inputPath); }
}

if (typeof args[3] !== 'undefined') {
	output.description = args[3];
	if (DEBUG) { console.log("Description: " + inputPath); }
}

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

	console.log(` - Writing JSON file to output/${inputFileName}.json`);

	fs.writeFileSync(outputPath + ".json", outputString, 'utf8');

	output.lastSaveTime = Date.now();
}

function saveOutputAsWebpage() {
	fs.readFile(pageTemplatePath, 'utf8', function (error, page) {
		if (error) {
			console.error(error);
			return;
		}

		let counters = Object.entries(output.counters);

		let sortedCounters = counters.sort((a, b) => b[1] - a[1]);
	
		let outputData = sortedCounters.slice(0, 100);
	
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
	
		let tableContents = json2html.transform({}, headerTemplate) + json2html.transform({}, contentTemplate.tableBody);
		
		let endTime = Date.now();

		let runTime = new Date(endTime - output.startTime).toISOString().substr(11, 8);
		runTime = runTime.replace(":", "h ");
		runTime = runTime.replace(":", "m ");
		runTime += "s";
		runTime = runTime.replace(/(^|\D)0+[hms ]/gm, ""); /* remove empty fields */
		runTime = runTime.replace(/(^|[hms ])(0+)(?![hms ])/gm, "$1"); /* remove leading zeros */
		runTime = runTime.trim();

		let siteTitle = `Frequency of ${output.tag} Tag Content in ${output.input}`;
		let tableTitle = `Frequency of <var>${output.tag}</var> Tag Content in <var>${output.input}</var>`;

		if (output.title != null) {
			siteTitle = output.title;
			tableTitle = output.title;
		}

		page = page.replace(/{%!SITE-TITLE!%}/g, siteTitle);
		page = page.replace(/{%!TABLE-TITLE!%}/g, tableTitle);
		
		page = page.replace(
			/{%!DESCRIPTION!%}/g,
			output.description != null ? `<details><summary>Description</summary><p>${output.description}</p></details>` : ""
		);

		page = page.replace(/{%!TABLE-CONTENTS!%}/g, tableContents);

		page = page.replace(/{%!INPUT!%}/g, output.input);
		page = page.replace(/{%!TAG!%}/g, output.tag);
		page = page.replace(/{%!TAG-COUNT!%}/g, output.totalTagsChecked);
		page = page.replace(/{%!UNIQUE-COUNT!%}/g, output.uniqueTagContents);
		page = page.replace(/{%!START-TIME!%}/g, new Date(output.startTime).toISOString());
		page = page.replace(/{%!END-TIME!%}/g, new Date(endTime).toISOString());
		page = page.replace(/{%!RUNTIME!%}/g, runTime);

		console.log(` - Writing HTML file to output/${inputFileName}.html`);

		fs.writeFileSync(outputPath + ".html", page, 'utf8');
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
		output.totalTagsChecked++;

		if (output.totalTagsChecked % 5000 === 0) {
			if (Date.now() > output.lastSaveTime + saveInterval) {
				saveOutputAsJson();
			}
		}

		if (Object.prototype.hasOwnProperty.call(output.counters, text)) {
			output.counters[text]++; 
		} else {
			output.counters[text] = 1;

			output.uniqueTagContents++;

			if (DEBUG) { console.log("New name: " + text); }
			
			if (output.uniqueTagContents % 1000 === 0) {
				updateLine("Unique names:" + output.uniqueTagContents + " in " + formatBytes(roughSizeOfObject(output.counters))); 
			}
		}

		insideTextTag = false;
	}
});

saxStream.on("end", function () {
	console.log('\nParsing finished.');

	output.isFinished = true;

	saveOutputAsJson();

	saveOutputAsWebpage();
});

saxStream.on("error", function (error) {
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
