#! /bin/zsh

# Make Mock S3 Bucket on Localstack
echo "Creating Mock S3 on LocalStack"
mockS3=$(aws s3 mb s3://imageapibucket --endpoint=http://localhost:4566)
echo "Done Creating Mock S3 on LocalStack ${mockS3}"


# Make Mock DynamoDB on Localstack
echo "Creating images table"
imageTable=$(aws dynamodb create-table \
                 --endpoint-url http://localhost:4566 \
                 --table-name Images \
                 --key-schema \
                     AttributeName=id,KeyType=HASH \
                 --attribute-definitions \
                     AttributeName=id,AttributeType=S \
                 --provisioned-throughput \
                     ReadCapacityUnits=1,WriteCapacityUnits=1
             )        
echo "Created Images Table: ${imageTable}"


echo "Scan from Images Table"
imagescan=$(aws dynamodb scan \
                --table-name Images \
                --endpoint-url http://localhost:4566)
echo "Scan from Images Table ${imagescan}" 
