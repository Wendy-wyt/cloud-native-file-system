# Cloud-Native Project

System Structure
![image](https://github.com/Wendy-wyt/fovus-interview/assets/78782949/b28003a3-3303-410a-9cbc-f1e11faf1d69)

## Deployment
1. Navigate to cdk directory
   ```
   cd cdk
   ```
2. create .env by following the .env.template
3. Set up cdk and start provisioning resources
   ```
   cdk bootstrap
   cdk deploy -O output.json
   ```
4. Navigate to frontend directory and create .env
5. Read necessary resources from output.json and copy some of them to ../frontend/.env
6. Stay in the frontend directory and build frontend
   ```
   npm run build
   ```
7. After successfully building the frontend project, upload frontend/build to the bucket created to host frontend (the bucket name is specified in cdk/output.json as FrontendBucket). You can use either of the two methods below:
   ***
   1. AWS Console
   Log into AWS console/S3 management page, click into the bucket with the frontend bucket name, and then upload all files and folders in the build directory.
   ```
   Objects inside the bucket:
   index.html
   ...
   static/
   ```
   2. AWS CLI
   ```
   aws s3 cp /path/to/frontend/build s3://<FrontendBucket> --recursive
   ```
   ***
8. Now you can access the website through the url as WebsiteUrl in the output.js
9. **Clean up**
   ```
   cd cdk
   cdk destroy
   ```
