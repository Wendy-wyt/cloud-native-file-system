import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { UploadFileResponseDto } from './interfaces';
import { S3_BUCKET, REGION, ACCESS_KEY, SECRET } from '../../utils/constants';

export const uploadFile = async (file: File): Promise<UploadFileResponseDto> => {

  if (file.type !== 'text/plain') {
    throw new Error('File type not supported. Please upload a text file.');
  }

  if (file.size > 1048576) {
    throw new Error('File size exceeds the limit of 1MB.');
  }

  const s3Client = new S3Client({
    region: REGION,
    credentials: {
      accessKeyId: ACCESS_KEY || '',
      secretAccessKey: SECRET || ''
    }
  });

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: file.name,
    Body: file
  });

  const res = await s3Client.send(command);

  if (res.$metadata.httpStatusCode !== 200) {
    throw new Error('File upload failed.');
  }

  s3Client.destroy();
  return {
    s3Url: S3_BUCKET + '/' + file.name
  };
};