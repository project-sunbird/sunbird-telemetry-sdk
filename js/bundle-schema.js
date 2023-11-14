var fs = require('fs');
var specFile = './schema/telemetry-spec.js';
var schemas = [];

if (fs.existsSync(specFile)) {
    fs.unlinkSync(specFile);
}
var files = fs.readdirSync('./schema/');
files.forEach(function (file) {
    if (file != 'event.json' && file != 'spec.js') {
        var data = fs.readFileSync('./schema/' + file, 'utf8');
        schemas.push(JSON.parse(data));
    }
})

fs.writeFileSync(specFile, 'var telemetrySchema = ' + JSON.stringify(schemas));
