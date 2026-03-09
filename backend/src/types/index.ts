export interface Event {
  eventId: string
  userId: string
  eventName: string
  createdAt: string
  status: 'active' | 'processing' | 'completed'
  totalPhotos: number
  totalFaces: number
}

export interface Photo {
  photoId: string
  eventId: string
  s3Url: string
  s3Key?: string
  faces: string[]
  uploadedAt: string
}

export interface Face {
  faceId: string
  eventId: string
  rekognitionFaceId: string
  samplePhotoUrl: string
  associatedPhotos: string[]
  qrCodeUrl?: string
}

export interface LambdaResponse {
  statusCode: number
  headers: {
    [key: string]: string | number | boolean
  }
  body: string
}

export interface APIGatewayEvent {
  httpMethod: string
  path: string
  pathParameters: { [key: string]: string } | null
  queryStringParameters: { [key: string]: string } | null
  headers: { [key: string]: string }
  body: string | null
  requestContext: {
    requestId: string
    identity: {
      sourceIp: string
    }
  }
}

export interface S3Event {
  Records: Array<{
    s3: {
      bucket: { name: string }
      object: { key: string }
    }
  }>
}

