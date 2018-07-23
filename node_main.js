var request = require('request');
var proxyTargetEndpoint = 'https://splintt.atlassian.net/';

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const port = process.argv[2] || 8080;
const proxyPort = 8081;

console.log('' + __dirname);

http.createServer(function (req, res) {
	if (req.url.startsWith('/proxy/')) {
		applyProxy(req, res, '/proxy/', proxyTargetEndpoint);
	} else if (req.url.startsWith('/upload/') && req.method == 'POST') {

		var uploadFilepath = path.resolve(__dirname, req.url.substr(1, req.url.length));
		console.log(`${req.url} -> ${uploadFilepath}`);
		var fws = fs.createWriteStream(uploadFilepath);
		fws.on('end', () => {
			res.statusCode = 204;
			res.end();
		}).on('finish', () => {
			res.statusCode = 204;
			res.end();
		}).on('close', () => {
			res.statusCode = 204;
			res.end();
		});
		req.pipe(fws);

	} else {
		serveStaticFiles(req, res);
	}
}).listen(parseInt(port));

console.log(`Static file server listening on port ${port}`);

function serveStaticFiles(req, res) {
	// parse URL
	const parsedUrl = url.parse(req.url);
	// extract URL path
	let pathname = `.${parsedUrl.pathname}`;
	// based on the URL path, extract the file extention. e.g. .js, .doc, ...
	const ext = path.parse(pathname).ext || '.html';
	// maps file extention to MIME typere
	const map = {
		'.ico': 'image/x-icon',
		'.html': 'text/html',
		'.js': 'text/javascript',
		'.json': 'application/json',
		'.css': 'text/css',
		'.png': 'image/png',
		'.jpg': 'image/jpeg',
		'.wav': 'audio/wav',
		'.mp3': 'audio/mpeg',
		'.svg': 'image/svg+xml',
		'.pdf': 'application/pdf',
		'.doc': 'application/msword'
	};
	fs.exists(pathname, function (exist) {
		console.log(`serving ${pathname} for URL ${req.url}`);
		if (!exist) {
			// if the file is not found, return 404
			res.statusCode = 404;
			res.end(`File ${pathname} not found!`);
			return;
		}

		// if is a directory search for index file matching the extention
		if (fs.statSync(pathname).isDirectory())
			pathname += '/index' + ext;

		// read file from file system
		fs.readFile(pathname, function (err, data) {
			if (err) {
				res.statusCode = 500;
				res.end(`Error getting the file: ${err}.`);
			} else {
				// if the file is found, set Content-type and send data
				res.setHeader('Content-type', map[ext] || 'text/plain');
				res.end(data);
			}
		});
	});
}

function applyProxy(req, resp, pathPrefix, targetEndpoint) {
	var url = req.url.substr(pathPrefix.length);
	console.log(`proxy ${req.method} -> ${url}`);
	var piped = null;

	if (req.method == 'GET') {
		piped = request.get(targetEndpoint + url);
	} else if (req.method == 'POST') {
		piped = request.post(targetEndpoint + url);
	} else if (req.method == 'PUT') {
		piped = request.put(targetEndpoint + url);
	}

	if (piped != null) {
		req.pipe(piped);
		piped.pipe(resp);

	}
}