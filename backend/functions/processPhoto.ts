import { S3Event } from 'aws-lambda'
import { v4 as uuidv4 } from 'uuid'
import { ensureCollection, detectFacesInS3, indexFaces } from '../src/utils/rekognition'
import { getItem, putItem, updateItem, queryItems } from '../src/utils/dynamodb'
import { getSignedUrlForDownload, uploadToS3 } from '../src/utils/s3'
const Jimp = require('jimp') as any

const RAW_PHOTOS_BUCKET = process.env.RAW_PHOTOS_BUCKET!
const FACES_TABLE = process.env.FACES_TABLE!
const PHOTOS_TABLE = process.env.PHOTOS_TABLE!
const EVENTS_TABLE = process.env.EVENTS_TABLE!
const REKOGNITION_COLLECTION_ID = process.env.REKOGNITION_COLLECTION_ID!

export const handler = async (event: S3Event): Promise<void> => {
  try {
    // Ensure Rekognition collection exists
    await ensureCollection(REKOGNITION_COLLECTION_ID)

    for (const record of event.Records) {
      const bucket = record.s3.bucket.name
      const key = record.s3.object.key

      // Skip processing if it's already a thumbnail
      if (key.includes('thumbnails/')) {
        console.log('Skipping thumbnail:', key)
        continue
      }

      // Extract eventId from key (format: eventId/photoId.jpg)
      const parts = key.split('/')
      if (parts.length < 2) {
        console.error('Invalid S3 key format:', key)
        continue
      }

      const eventId = parts[0]
      const photoId = parts[1].replace('.jpg', '') // assumes jpg extension

      console.log(`Processing photo: ${key} for event: ${eventId}`)

      // Get photo record
      const photo = await getItem(PHOTOS_TABLE, { photoId })
      if (!photo) {
        // If not found, it might be a new upload not yet in DB (or race condition).
        // For robustness we could create it, but standard flow assumes uploadPhoto created it.
        console.error(`Photo record not found in DB: ${photoId}`)
        // Check if we should continue? In this flow, we need the record to update faces.
        // We'll continue anyway to try face indexing if needed, but logging error is safer.
        continue
      }

      // --- Thumbnail Generation ---
      let thumbnailS3Key = null
      let totalBytesProcessed = record.s3.object.size // Start with original size

      try {
        const s3 = require('../src/utils/s3').s3Client
        const { PutObjectCommand } = require('@aws-sdk/client-s3')

        // Fetch original image
        const originalImage = await Jimp.read(await getSignedUrlForDownload(bucket, key, 300))

        // Resize to 400px width (auto height) or 400x400 cover
        originalImage.resize(400, Jimp.AUTO).quality(80)

        const thumbnailBuffer = await originalImage.getBufferAsync(Jimp.MIME_JPEG)

        // Add thumbnail size to total
        totalBytesProcessed += thumbnailBuffer.length

        thumbnailS3Key = `thumbnails/${eventId}/${photoId}.jpg`

        // Upload thumbnail
        await s3.send(new PutObjectCommand({
          Bucket: bucket,
          Key: thumbnailS3Key,
          Body: thumbnailBuffer,
          ContentType: 'image/jpeg'
        }))

        console.log(`Thumbnail created: ${thumbnailS3Key}, Size: ${thumbnailBuffer.length} bytes`)

        // Update photo record with thumbnail key
        await updateItem(
          PHOTOS_TABLE,
          { photoId },
          'SET thumbnailS3Key = :thumb, sizeBytes = :size',
          { ':thumb': thumbnailS3Key, ':size': record.s3.object.size }
        )

      } catch (thumbError) {
        console.error('Thumbnail generation failed:', thumbError)
      }

      // Update EVENT stats with total bytes (Atomic increment)
      try {
        await updateItem(
          EVENTS_TABLE,
          { eventId },
          'SET totalFaces = totalFaces + :faces, totalPhotos = totalPhotos + :photos, totalSizeBytes = if_not_exists(totalSizeBytes, :zero) + :bytes',
          {
            ':faces': 0, // Will be updated below if faces found, but we want to fail safe here 
            ':photos': 1, // Increment photo count here to be safe
            ':zero': 0,
            ':bytes': totalBytesProcessed
          }
        )
      } catch (statError) {
        console.error('Failed to update event stats:', statError)
      }

      // -----------------------------

      // Detect faces in the photo
      const faceDetails = await detectFacesInS3(bucket, key)

      console.log(`Detected ${faceDetails.length} faces`)

      if (faceDetails.length > 0) {
        // Index faces in Rekognition collection
        const faceRecords = await indexFaces(REKOGNITION_COLLECTION_ID, bucket, key, faceDetails.length)
        const faceIds: string[] = []

        for (const faceRecord of faceRecords) {
          if (!faceRecord.Face || !faceRecord.Face.FaceId) continue

          const rekognitionFaceId = faceRecord.Face.FaceId
          const confidence = faceRecord.Face.Confidence || 0
          const faceId = uuidv4()

          // Just use the original signed url for now as sample
          const samplePhotoUrl = await getSignedUrlForDownload(RAW_PHOTOS_BUCKET, key, 86400 * 7)

          const face = {
            faceId,
            eventId,
            rekognitionFaceId,
            samplePhotoUrl,
            associatedPhotos: [photoId],
            confidence,
          }

          await putItem(FACES_TABLE, face)
          faceIds.push(faceId)
        }

        // Update event face count ONLY
        if (faceIds.length > 0) {
          await updateItem(
            EVENTS_TABLE,
            { eventId },
            'SET totalFaces = totalFaces + :inc',
            { ':inc': faceIds.length }
          )
        }

        // Update photo with face IDs
        await updateItem(
          PHOTOS_TABLE,
          { photoId },
          'SET faces = :faces',
          { ':faces': faceIds }
        )
      }
    }
  } catch (error) {
    console.error('Error processing photo:', error)
    throw error
  }
}


