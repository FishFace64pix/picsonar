import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Upload } from '@aws-sdk/lib-storage'

const s3Client = new S3Client({ region: process.env.REGION || 'us-east-1' })

export async function uploadToS3(
  bucket: string,
  key: string,
  body: Buffer | Uint8Array | string,
  contentType?: string
): Promise<void> {
  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    },
  })
  await upload.done()
}

export async function getSignedUrlForUpload(
  bucket: string,
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new PutObjectCommand({ Bucket: bucket, Key: key })
  return getSignedUrl(s3Client, command, { expiresIn })
}

export async function getSignedUrlForDownload(
  bucket: string,
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key })
  return getSignedUrl(s3Client, command, { expiresIn })
}

export async function deleteFromS3(bucket: string, key: string): Promise<void> {
  const command = new DeleteObjectCommand({ Bucket: bucket, Key: key })
  await s3Client.send(command)
}

