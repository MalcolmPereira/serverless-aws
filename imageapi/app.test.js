const fs = require('fs');

const { lambdaHandler } = require("./app");

describe("AWS ImageAPI Lambda Tests", () => {

    //Make sure LocalStack is running
    //https://github.com/localstack/localstack

    //Run ../../localstack/makeImageAPImock.sh to create mock S3 and DynamoDB Entities

    //Set Env Variable for LOCALSTACK_ENDPOINT
    beforeEach(() => {
        process.env = {
            "AWS_REGION": "us-east-2",
            "LOCALSTACK_ENDPOINT": "http://localhost:4566"
        };
    });


    //Test Resize Image /  (Add, List, Get, Delete)
    test("Should Resize Image, List Images, Get Image and Dete Image", async () => {
        //Read base64 Image
        let imagebase64 = Buffer.from(fs.readFileSync("cube.png")).toString('base64');

        //Resize Image
        let request = {
            "image": imagebase64,
            "scaletype": "BICUBIC",
            "width": 10,
            "height": 10
        };
        let event = {
            "httpMethod": "POST",
            "body": JSON.stringify(request)
        };
        let result = await lambdaHandler(event, null);
        expect(result).toBeTruthy();
        expect(result.statusCode).toBeTruthy();
        expect(result.statusCode).toBe(200);
        expect(result.body).toBeTruthy();

        //Get Images
        event = {
            "httpMethod": "GET",
        };
        let resultImages = await lambdaHandler(event, null);
        expect(resultImages).toBeTruthy();
        expect(resultImages.statusCode).toBeTruthy();
        expect(resultImages.statusCode).toBe(200);
        expect(resultImages.body).toBeTruthy();
        let resultImagesObj = JSON.parse(resultImages.body);
        expect(resultImagesObj).toBeTruthy();
        expect(resultImagesObj.images).toBeTruthy();
        expect(resultImagesObj.images.length > 0).toBe(true);
        let imageIDStr = resultImagesObj.images[0].id
        expect(imageIDStr).toBeTruthy();

        //Get Image By ID
        event = {
            "httpMethod": "GET",
            "pathParameters": {
                "imageid": imageIDStr
            }
        };
        let resultImg = await lambdaHandler(event, null);
        expect(resultImg).toBeTruthy();
        expect(resultImg.statusCode).toBeTruthy();
        expect(resultImg.statusCode).toBe(200);
        expect(resultImg.body).toBeTruthy();
        let resultImgObj = JSON.parse(resultImg.body);
        expect(resultImgObj).toBeTruthy();
        expect(resultImgObj.original).toBeTruthy();
        expect(resultImgObj.resized).toBeTruthy();

        //Delete Image
        event = {
            "httpMethod": "DELETE",
            "pathParameters": {
                "imageid": imageIDStr
            }
        };
        let resultDeleteImg = await lambdaHandler(event, null);
        expect(resultDeleteImg).toBeTruthy();
        expect(resultDeleteImg.statusCode).toBeTruthy();
        expect(resultDeleteImg.statusCode).toBe(200);
        expect(resultDeleteImg.body).toBeTruthy();
        let resultDeleteImgObj = JSON.parse(resultDeleteImg.body);
        expect(resultDeleteImgObj).toBeTruthy();
        expect(resultDeleteImgObj.id).toBe(imageIDStr);
    });
});