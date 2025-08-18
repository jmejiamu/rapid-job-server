import AWS from "aws-sdk";

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

export const uploadToS3 = async (
  buffer: Buffer,
  fileName: string,
  mimeType: string
) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: fileName,
    Body: buffer,
    ContentType: mimeType,
    // ACL: "public-read",
  };
  const data = await s3.upload(params).promise();
  return data.Location;
};

export const deleteFromS3 = async (imageKey: string) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: imageKey,
  };
  await s3.deleteObject(params).promise();
};
