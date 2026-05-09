import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Upload } from '@aws-sdk/lib-storage'

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-central-1',
  // Disable automatic checksum injection so browser fetch() can PUT to presigned URLs
  // without needing to compute or send x-amz-checksum-* headers.
  requestChecksumCalculation: 'WHEN_REQUIRED' as any,
})

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

/** Delete every S3 object whose key starts with `prefix`. Handles pagination. */
export async function deleteS3Prefix(bucket: string, prefix: string): Promise<void> {
  let continuationToken: string | undefined
  do {
    const list = await s3Client.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: continuationToken }),
    )
    const keys = (list.Contents ?? []).map((o) => ({ Key: o.Key! }))
    if (keys.length > 0) {
      await s3Client.send(
        new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys, Quiet: true } }),
      )
    }
    continuationToken = list.IsTruncated ? list.NextContinuationToken : undefined
  } while (continuationToken)
}

