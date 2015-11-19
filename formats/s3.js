// S3 file format
//
var moment = require('moment');

var header = [
  'input',
  'hash',
  'host',
  'date',
  'ip',
  '-',
  'id',
  'type',
  'file',
  'http',
  'resCode',
  '-',
  'size1',
  'size2',
  'size3',
  'size4',
  'referer',
  'user-agent',
  '-'
];

// Convert log format into a JSON object.
//
var convert = function(row) {
  var obj = {};
  // http://docs.aws.amazon.com/AmazonS3/latest/dev/LogFormat.html
  var regexLogLine = /(\S+) (\S+) (\S+ \+\S+\]) (\S+) (\S+) (\S+) (\S+) (\S+) (\S+\s\S+\s\S+) (\S+) (\S+) (\S+) (\S+) (\S+) (\S+) (\S+) (".+") (\S+)/;

  // Chop the line.
  var vals = regexLogLine.exec(row);
  var fields = header.length;

  if (vals && vals.length === fields) {
    header.forEach(function(key, index){
      obj[key] = vals[index];
    });
    obj['timestamp'] = moment(obj['date'], 'DD/MMM/YYYY:HH:mm:ss Z').toISOString();
    return JSON.stringify(obj, undefined, 0) + '\n';
  }

  return "";
};

module.exports = {
  toJson: convert,
  fileDateFormat: 'YYYY-MM-DD',
  reportFields: header
};
