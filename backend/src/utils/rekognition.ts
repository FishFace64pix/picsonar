import {
  RekognitionClient,
  DetectFacesCommand,
  IndexFacesCommand,
  SearchFacesByImageCommand,
  CreateCollectionCommand,
} from '@aws-sdk/client-rekognition'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const rekognitionClient = new RekognitionClient({ region: process.env.REGION || 'us-east-1' })
const s3Client = new S3Client({ region: process.env.REGION || 'us-east-1' })

export async function ensureCollection(collectionId: string): Promise<void> {
  try {
    await rekognitionClient.send(new CreateCollectionCommand({ CollectionId: collectionId }))
  } catch (error: any) {
    if (error.name !== 'ResourceAlreadyExistsException') {
      throw error
    }
  }
}

export async function detectFacesInS3(bucket: string, key: string): Promise<any[]> {
  const command = new DetectFacesCommand({
    Image: {
      S3Object: {
        Bucket: bucket,
        Name: key,
      },
    },
    Attributes: ['ALL'],
  })

  const response = await rekognitionClient.send(command)
  return response.FaceDetails || []
}

export async function indexFaces(
  collectionId: string,
  bucket: string,
  key: string,
  maxFaces: number = 1
): Promise<any[]> {
  const command = new IndexFacesCommand({
    CollectionId: collectionId,
    Image: {
      S3Object: {
        Bucket: bucket,
        Name: key,
      },
    },
    MaxFaces: maxFaces,
    QualityFilter: 'AUTO',
    DetectionAttributes: ['ALL'],
  })

  const response = await rekognitionClient.send(command)
  return response.FaceRecords || []
}

export async function searchFacesByImage(
  collectionId: string,
  imageBytes: Buffer
): Promise<any[]> {
  const command = new SearchFacesByImageCommand({
    CollectionId: collectionId,
    Image: {
      Bytes: imageBytes,
    },
    FaceMatchThreshold: 80,
    MaxFaces: 10,
  })

  const response = await rekognitionClient.send(command)
  return response.FaceMatches || []
}

export async function getS3Object(bucket: string, key: string): Promise<Buffer> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key })
  const response = await s3Client.send(command)

  if (!response.Body) {
    throw new Error('Empty S3 object body')
  }

  const chunks: Uint8Array[] = []
  for await (const chunk of response.Body as any) {
    chunks.push(chunk)
  }

  return Buffer.concat(chunks)
}

export async function getSignedS3Url(bucket: string, key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key })
  return getSignedUrl(s3Client, command, { expiresIn })
}

export async function deleteFaces(collectionId: string, faceIds: string[]): Promise<void> {
  const { DeleteFacesCommand } = require('@aws-sdk/client-rekognition')
  const command = new DeleteFacesCommand({
    CollectionId: collectionId,
    FaceIds: faceIds,
  })
  await rekognitionClient.send(command)
}

export async function deleteCollection(collectionId: string): Promise<void> {
  const { DeleteCollectionCommand } = require('@aws-sdk/client-rekognition')
  const command = new DeleteCollectionCommand({ CollectionId: collectionId })
  await rekognitionClient.send(command)
}
