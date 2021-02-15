const crypto = require('crypto');
const AWS = require("aws-sdk");
const sharp = require("sharp");

//S3 Buckets Constants
const BUCKET_NAME = "imageapibucket";
const ORIGINAL = "Original/";
const RESIZED = "Resized/";

//S3 Client
var S3;

//DynamoDB Client
var dynamoDBClient;

//Maing Lambda Handler
exports.lambdaHandler = async (event, context) => {
    try {

        //Configure AWS DynamoDB and S3 Clients
        configureAWS();

        if (!event || !event.httpMethod) {
            return getLambdaResponse(400, getStatusResponse(400, "Invalid Request, please specify valid imageapi request"));
        }

        switch (event.httpMethod.toUpperCase()) {

            case "POST":
                console.log("POST Add new Image ");
                let imageAPIRequest = JSON.parse(event.body);
                if (!imageAPIRequest.image || !imageAPIRequest.scaletype || !imageAPIRequest.width || !imageAPIRequest.height) {
                    return getLambdaResponse(400, getStatusResponse(400, "Invalid Request, please specify valid image resize request"));
                }
                var result = await processResize(imageAPIRequest);
                return getLambdaResponse(200, result);


            case "GET":
                var result;
                if (event.pathParameters && event.pathParameters.imageid) {
                    console.log("GET event.pathParameters.imageid ", event.pathParameters.imageid);
                    result = await processGetImage(event.pathParameters.imageid);

                } else {
                    console.log("GET All Images ");
                    result = await processGetImages((event.queryStringParameters && event.queryStringParameters.lastimageid) ? event.queryStringParameters.lastimageid : "");
                }
                return getLambdaResponse(200, result);


            case "DELETE":
                if (!event.pathParameters && !event.pathParameters.imageid) {
                    return getLambdaResponse(400, getStatusResponse(400, "Invalid Operation, No Image Id for deletion"));
                }
                console.log("DELETE event.pathParameters.imageid ", event.pathParameters.imageid);
                var result = await processDeleteImage(event.pathParameters.imageid);
                return getLambdaResponse(200, result);

            case "OPTIONS":
                console.log("OPTIONS Method  ");
                return getLambdaResponse(200, getStatusResponse(200, "{}"));

            default:
                return getLambdaResponse(400, getStatusResponse(400, "Invalid Operation"));
        }

    } catch (err) {
        console.log(err);
        return getLambdaResponse(500, getStatusResponse(500, "Server Error Processing Request"));
    }
};

//Configure AWS DynamoDB, S3 Clients
configureAWS = () => {
    //Defaut to us-east-2
    AWS.config.update(
        {
            region: "us-east-2"
        }
    );

    //Check Environment Variable for LocalStack local testing
    if (process.env.LOCALSTACK_ENDPOINT && process.env.LOCALSTACK_ENDPOINT.length > 0) {
        console.log("LocalStack local testing if effect.");
        console.log("LocalStack EndPoint: ", process.env.LOCALSTACK_ENDPOINT);
        AWS.config.update(
            {
                region: "us-east-2",
                endpoint: process.env.LOCALSTACK_ENDPOINT
            }
        );
    }

    //Configure DynamoDB client
    dynamoDBClient = new AWS.DynamoDB.DocumentClient();

    //Configure S3 client
    S3 = new AWS.S3(
        {
            apiVersion: '2006-03-01',
            sslEnabled: false,
            s3ForcePathStyle: true
        }
    );
};

//Process Image Resize
processResize = async (imageObj) => {
    var original;
    var resized;
    var image = {};
    try {

        var scaleType = "cubic";
        if (imageObj.scaletype === "NEAREST_NEIGHBOR") {
            scaleType = "nearest";
        } else if (imageObj.scaletype === "BICUBIC") {
            scaleType = "cubic";
        }

        //Upload Original to S3
        original = await uploadtoS3(imageObj.image, true);

        //Resize Image and Convert to PNG
        let imgBuffer = await sharp(Buffer.from(imageObj.image, "base64"))
            .resize(
                {
                    "width": imageObj.width,
                    "height": imageObj.height,
                    "kernel": scaleType,
                }
            )
            .toFormat("png")
            .toBuffer();

        //Get Base64 for the Resized Image  
        imageObj.image = imgBuffer.toString('base64');

        //Upload Resized to S3
        resized = await uploadtoS3(imageObj.image, false);

        //Get ID
        let id = original.key.substring(ORIGINAL.length)

        //Generate 50 x 50 Thumbnail to be stored in DynamoDB
        let imgThumbnailBuffer = await sharp(Buffer.from(imageObj.image, "base64"))
            .resize(
                {
                    "width": 128,
                    "height": 128,
                    "kernel": "cubic",
                }
            )
            .toFormat("png")
            .toBuffer();


        //Insert to DynamoDB
        await insertDynamoDB(id, new Date().toISOString(), original.key, resized.key, imgThumbnailBuffer.toString('base64'));

        image.resized = imageObj.image;

        return image;

    } catch (err) {
        console.log("Got Error Processing Resize", err)
        if (original && original.key) {
            console.log("Cleaning up Original from S3: ", original.key);
            await deleteFromS3(original.key);
        }
        if (resized && resized.key) {
            console.log("Cleaning up Resized from S3: ", resized.key);
            await deleteFromS3(resized.key);
        }
        throw err
    }
};

//Insert into Dynamo DB
insertDynamoDB = async (id, date, keyOriginal, keyResized, imgThumbnail) => {
    var imageData = {
        TableName: "Images",
        Item: {
            "id": id,
            "dateUploaded": date,
            "keyOriginal": keyOriginal,
            "keyResized": keyResized,
            "thumbnail": imgThumbnail
        },
        ReturnValues: 'ALL_OLD'
    };
    try {
        await dynamoDBClient.put(imageData)
            .promise()
            .catch((error) => {
                throw error;
            });
    } catch (err) {
        console.log("Got Error Adding New Image", err);
        throw err;
    }
};

//Get Images
processGetImages = async (lastImageID) => {
    var imageData = {
        TableName: "Images",
        ProjectionExpression: "id,dateUploaded,thumbnail",
    };
    if (lastImageID && lastImageID.length > 0) {
        imageData.ExclusiveStartKey = lastImageID
    }
    var imageResponse = {
        images: [],
        lastimageid: ""
    };
    try {
        await dynamoDBClient
            .scan(imageData)
            .promise()
            .then((data) => {
                if (data && data.Items) {
                    data.Items.forEach(item => {

                        imageResponse.images.push(
                            {
                                "id": item.id,
                                "dateUploaded": item.dateUploaded,
                                "thumbnail": item.thumbnail
                            }
                        );
                    });
                }
                if (data && data.LastEvaluatedKey) {
                    imageResponse.lastimageid = data.LastEvaluatedKey;
                }
            })
            .catch((error) => {
                throw error;
            });

    } catch (err) {
        console.log("Got Error Listing Images", err);
        throw err;
    }
    return imageResponse;
};

//Get Image By ID
processGetImage = async (imageid) => {
    var imageData = {
        TableName: "Images",
        Key: {
            "id": imageid
        }
    };
    let image = {};
    var original;
    var resized;
    try {
        await dynamoDBClient
            .get(imageData)
            .promise()
            .then((data) => {
                if (data && data.Item) {
                    image.id = data.Item.id;
                    original = data.Item.keyOriginal;
                    resized = data.Item.keyResized;
                }
            })
            .catch((error) => {
                throw error;
            });

        let originalImg = await getFromS3(original);
        let resizedImg = await getFromS3(resized);
        image.original = Buffer.from(originalImg.Body).toString("base64");
        image.resized = Buffer.from(resizedImg.Body).toString("base64");

    } catch (err) {
        console.log("Got Error Getting Image", err);
        throw err;
    }
    return image;
};

//Delete Image
processDeleteImage = async (imageid) => {
    var imageData = {
        TableName: "Images",
        Key: {
            "id": imageid
        },
        ReturnValues: 'ALL_OLD'
    };
    var image = {};
    var originalKey;
    var resizedKey;
    try {
        await dynamoDBClient
            .delete(imageData)
            .promise()
            .then((data) => {
                image.id = data.Attributes.id;
                image.date = data.Attributes.dateUploaded;
                originalKey = data.Attributes.keyOriginal;
                resizedKey = data.Attributes.keyResized;
            })
            .catch((error) => {
                throw error;
            });

        await deleteFromS3(originalKey);

        await deleteFromS3(resizedKey);

    } catch (err) {
        console.log("Got Error Deleting  Image", err);
        throw err;
    }
    return image;
};

//Get Lambda Response
getLambdaResponse = (statusCode, responseObj) => {
    return {
        "statusCode": statusCode,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": true,
            "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        },
        "body": JSON.stringify(responseObj)
    };
};

//Get Status Response
getStatusResponse = (statusCode, message) => {
    return {
        "statusCode": statusCode,
        "message": message
    };
};

//Upload Image to S3
uploadtoS3 = async (image, isOriginal) => {
    var key = crypto.createHash("sha256").update(image).digest("base64");
    key = key.replace(/\//g, '');
    key = key.replace(/=/g, '');
    if (isOriginal) {
        key = ORIGINAL + key + Date.now();
    } else {
        key = RESIZED + key + Date.now();
    }
    return await S3.upload({ Bucket: BUCKET_NAME, Key: key, Body: Buffer.from(image, "base64") }).promise();
};

//Get Image From S3
getFromS3 = async (key) => {
    return await S3.getObject({ Bucket: BUCKET_NAME, Key: key }).promise();
};

//Delete Image from S3
deleteFromS3 = async (key) => {
    await S3.deleteObject({ Bucket: BUCKET_NAME, Key: key }).promise();
};

