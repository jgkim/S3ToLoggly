// AWS Lambda Script to send S3 logs to Loggly

var aws = require('aws-sdk');
var s3  = new aws.S3({apiVersion: '2006-03-01'});

var _       = require('lodash');
var async   = require('async');
var request = require('request');
var stream  = require('stream');
var through = require('through');
var zlib    = require('zlib');
var split   = require('split');

var formats = require('./formats');

// Set the tag 'loggly-customer-token'to set Loggly customer token on the S3 bucket.
// Set the tag 'loggly-tag' to set Loggly tag on the S3 bucket.

LOGGLY_URL_BASE             = 'https://logs-01.loggly.com/bulk/';
BUCKET_LOGGLY_TOKEN_NAME    = 'loggly-customer-token';
BUCKET_LOGGLY_TAG_NAME      = 'loggly-tag';
BUCKET_LOGGLY_FORMAT_PREFIX = 'loggly-format-';

// Used if no S3 bucket tag doesn't contain customer token.
// Note: You either need to specify a cutomer token in this script or via the S3 bucket tag else an error is logged.
DEFAULT_LOGGLY_URL = null;

// Used if no S3 bucket tag doesn't contain format for the prefix.
// Note: You need to specify a format via the S3 bucket tag else logs will be uploaded withouth parsing.
DEFAULT_LOGGLY_FORMAT = null;

if ( typeof LOGGLY_TOKEN !== 'undefined' ) {
  DEFAULT_LOGGLY_URL = LOGGLY_URL_BASE + LOGGLY_TOKEN;

  if ( typeof LOGGLY_TAG !== 'undefined' ) {
      DEFAULT_LOGGLY_URL += '/tag/' + LOGGLY_TAG;
  }
}

if ( DEFAULT_LOGGLY_URL ) {
  console.log('Loading S3ToLoggly, default Loggly endpoint: ' + DEFAULT_LOGGLY_URL);
} else {
  console.log('Loading S3ToLoggly, NO default Loggly endpoint, must be set in bucket tag ' + BUCKET_LOGGLY_TOKEN_NAME );
}

exports.handler = function(event, context) {
  // Get the object from the event and show its content type.
  var bucket = event.Records[0].s3.bucket.name;
  var key    = event.Records[0].s3.object.key;
  var size   = event.Records[0].s3.object.size;

  if ( size == 0 ) {
    console.log('S3ToLoggly skipping object of size zero')
  } else {
    // Download the logfile from S3 and upload to loggly.
    async.waterfall([
      function buckettags(next) {
        var params = {
          Bucket: bucket
        };
        var prefix = key.split('/', 1)[0];

        s3.getBucketTagging(params, function(error, data) {
          if (error) {
            next(error);
          } else {
            var s3tag = _.zipObject(_.pluck(data['TagSet'], 'Key'), _.pluck(data['TagSet'], 'Value'));

            LOGGLY_FORMAT = s3tag[BUCKET_LOGGLY_FORMAT_PREFIX + prefix] || DEFAULT_LOGGLY_FORMAT;

            if (s3tag[BUCKET_LOGGLY_TOKEN_NAME]) {
              LOGGLY_URL = LOGGLY_URL_BASE + s3tag[BUCKET_LOGGLY_TOKEN_NAME];

              if ( s3tag[BUCKET_LOGGLY_TAG_NAME] ) {
                LOGGLY_URL += '/tag/' + s3tag[BUCKET_LOGGLY_TAG_NAME];
                if (LOGGLY_FORMAT) {
                  LOGGLY_URL += ',' + LOGGLY_FORMAT;
                }
              }
            } else {
              LOGGLY_URL = DEFAULT_LOGGLY_URL
            }
          }

          if ( LOGGLY_URL ) {
            next(null);
          } else {
            next('No Loggly customer token. Set S3 bucket tag ' + BUCKET_LOGGLY_TOKEN_NAME);
          }
        });
      },

      function download(next) {
        // Download the image from S3 into a buffer.
        s3.getObject({
          Bucket: bucket,
          Key: key
        }, next);
      },

      function parse(data, next) {
        // Parse the logfile if possible.
        var buffer = through(function write(data) {
            this.queue(data);
          }, function end() {
            this.queue(null);
          });
          buffer.pause();
          buffer.write(data.Body);
          buffer.end();

        var stream = buffer;
        if (LOGGLY_FORMAT) {
          var format = formats[LOGGLY_FORMAT];
          var reader = buffer;
          var gunzip = zlib.createGunzip();

          if (format.gzip) {
            buffer.pipe(gunzip);
            reader = gunzip;
          }

          stream = reader.pipe(split()).pipe(through(function write(data) {
            this.queue(format.toJson(data.toString()));
          }, function end() {
            this.queue(null);
          }));
        }

        stream.pause();
        buffer.resume();
        next(null, stream);
      },

      function upload(stream, next) {
        // Stream the logfile to Loggly.
        stream.pipe(request.post({
          url: LOGGLY_URL,
          json: true
        })).on('error', function (error) {
          next(error);
        }).on('end', function () {
          next(null);
        });
        stream.resume();
      }
    ],
    function (error) {
      if (error) {
        console.error(
          'Unable to read ' + bucket + '/' + key +
          ' and upload to loggly' +
          ' due to an error: ' + error
        );
      } else {
        console.log(
          'Successfully uploaded ' + bucket + '/' + key +
          ' to ' + LOGGLY_URL
        );
      }
      context.done();
    });
  }
};
