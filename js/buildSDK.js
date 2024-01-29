var fs = require("fs");
var path = require("path");

var readFilePromise = (filePath) => {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if(err) { 
                reject(err)
            } else {
                resolve(data)
            }
        })
    })
}

var concatFile = () => {
    var files = [
        './libs/ajv.min.js',
        './schema/telemetry-spec.js',
        './libs/detectClient.js',
        './libs/md5.js',
        './libs/ua-parser.min.js',
        './libs/fingerprint2.min.js',
        './core/telemetryV3Interface.js',
        './core/telemetrySyncManager.js',
    ];
    Promise.all(files.map(file => readFilePromise(path.join(__dirname, file)))).then(filesData => {
        if(!fs.existsSync(path.join(__dirname, '/dist'))) {
            fs.mkdirSync(path.join(__dirname, '/dist'))
        }
        fs.writeFileSync(path.join(__dirname, '/dist/index.js'), "")
        var outputStream = fs.createWriteStream(path.join(__dirname, '/dist/index.js'));
        filesData.forEach(fileData => {
            outputStream.write(fileData);
            outputStream.write("\r\n");
        })
        outputStream.end();
    }).catch(error => {
        console.log(error, `while concatinating the files`)
        process.exit(1);
    })
}
concatFile()

