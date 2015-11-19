# S3ToLoggly
A Node.js AWS Lambda script that send logs stored in S3 to Loggly

## More information about AWS Lambda and Loggly
  * http://aws.amazon.com/lambda/
  * https://www.loggly.com/

## Get the code and prep it for the uploading to AWS
* Clone the git repo.
```bash
git clone https://github.com/jgkim/S3ToLoggly.git
cd S3ToLoggly
```

* Install require npm packages.
```
npm install
```
* Zip up your code.
```
zip -r S3ToLoggly.zip S3ToLoggly.js formats node_modules
```
The resulting zip (`S3ToLoggly.zip`) is what you will upload to AWS in step 1 below.

## Setting up AWS
For all of the AWS setup, I used the AWS console following [this example](http://docs.aws.amazon.com/lambda/latest/dg/getting-started-amazons3-events.html). Below, you will find a high-level description of how to do this. I also found [this blog post](http://alestic.com/2014/11/aws-lambda-cli) on how to set things up using the command line tools.

### Create and upload the S3ToLoggly Lamba function in the AWS Console
1. Create lambda function.
  1. https://console.aws.amazon.com/lambda/home
  2. Click "Create a Lambda function" button. *(Choose "Upload a .ZIP file")*
    * **Name:** *`S3ToLoggly`*
    * Upload lambda function (zip file you made above.)
    * **Handler*:** *`S3ToLoggly.handler`*
    * **Role*:** In the drop down click "`S3 execution role`". (This will open a new window to create the role.) You should also manually add a permission for `s3:GetBucketTagging` to the role according to the [issue](https://github.com/psquickitjayant/S3ToLoggly/issues/2).
    * I left the memory at 128MB. In my testing with s3 bucket set upload every 5 minutes this worked for me. You may need to bump this up if your s3 logs are larger.
    * Same advice for Timer, I set it to 10 seconds.
2. Configure Event Source to call S3ToLoggly when logs added to S3 bucket.
  1. https://console.aws.amazon.com/lambda/home
  2. Make sure the S3ToLoggly lambda function is selected, then click '`Actions`->`Add event source`'
    * **Event source type:** S3
    * **Bucket:** Choose the S3 bucket that contains your logs.
    * **Event type:** ObjectCreated (All)

### Configure the S3 buckets with tags the S3ToLoggly uses to know where to send and how to parse logs
Using S3 Management Console click the bucket that contains your S3 logs.
  1. Under `Properties` -> `Tags` add the following tag:
    1. **Key:** `loggly-customer-token` , **Value:** *your-loggly-customer-token*
    2. **Key:** `loggly-tag`, **Value:** *aws* (Or what ever you want.)
    3. **Key:** `loggly-format-your-prefix-for-format`, **Value:** _your-format_ (e.g., `s3` for `loggly-format-s3` or `cloudfront` for `loggly-format-cloudfront`)

**NOTE:** This script currently parses only S3 and CloudFront logs. If the format is not described as a tag, it sends raw logs to Loggly. If you want to parse your own logs and convert them to JSON, you can add a parser into the `formats` directory. JSON logs can be automatically parsed in Loggly when each log is on a line in a valid JSON format. See more for [JSON Automated Parsing](https://www.loggly.com/docs/automated-parsing/#json) in Loggly.

**DISCLAIMER:** This script was originally written by [psquickitjayant](https://github.com/psquickitjayant/S3ToLoggly), and all the parsers included in the `formats` directory are derived from [spotcheck](https://www.npmjs.com/package/spotcheck).
