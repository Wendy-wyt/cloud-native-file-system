#!/bin/bash

tableName=$1
id=$2

echo "Setting variables from dynamodb"
aws dynamodb get-item --table-name $tableName --key '{"id":{"S":"'$id'"}}' --region us-east-1 > item.json

input_file_path=$(jq '.Item.input_file_path.S' item.json | tr -d '"')
bucket_name="${input_file_path%/*}"
input_file_name="${input_file_path##*/}"
input_text=$(jq '.Item.input_text.S' item.json | tr -d '"')
output_file_name="${input_file_name%.*}-output.${input_file_name##*.}"
output_file_path="$bucket_name/$output_file_name"

echo "Downloading input file"
aws s3 cp "s3://$input_file_path" "$output_file_name"

echo "Appending input text to output file"
echo ":" >> $output_file_name
echo $input_text >> $output_file_name

echo "Uploading output file to s3"
aws s3 cp $output_file_name "s3://$output_file_path"

echo "Updating dynamodb"
aws dynamodb update-item \
    --table-name $tableName \
    --key '{"id":{"S":"'$id'"}}' \
    --update-expression "SET #path = :y" \
    --expression-attribute-names '{"#path": "output_file_path"}' \
    --expression-attribute-values '{":y":{"S": "'$output_file_path'"}}' \
    --region us-east-1

echo "Cleaning up"
sudo shutdown now -h