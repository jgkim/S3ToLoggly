// Cloudfront
//
var header = [
  'date',
  'time',
  'x-edge-location',
  'sc-bytes',
  'c-ip',
  'cs-method',
  'cs(Host)',
  'cs-uri-stem',
  'sc-status',
  'cs(Referer)',
  'cs(User-Agent)',
  'cs-uri-query',
  'cs(Cookie)',
  'x-edge-result-type',
  'x-edge-request-id',
  'x-host-header',
  'cs-protocol',
  'cs-bytes',
  'time-taken'
];

// Convert log format into a JSON object.
//
var convert = function(row) {
  // Skip commented lines.
  if (row[0] === '#') return "";
  // Skip blank lines.
  if (row === '') return "";

  var obj = {};
  var vals = row.split('\t');
  var fields = header.length;

  if (vals.length >= fields) {
    header.forEach(function(key, index){
      obj[key] = vals[index];
    });
    // The date and time are in Coordinated Universal time (UTC).
    obj['timestamp'] = obj['date'] + 'T' + obj['time'] + 'Z';
    return JSON.stringify(obj, undefined, 0) + '\n';
  } else {
    console.log("Skipping row. Log contains fewer values than expected.")
  }

  return "";
};

module.exports = {
  toJson: convert,
  gzip: true,
  fileDateFormat: 'YYYY-MM-DD',
  reportFields: header
};
