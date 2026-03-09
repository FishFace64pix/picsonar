
import { handler } from '../functions/matchFace';
import { APIGatewayProxyEvent } from 'aws-lambda';
import * as rekognitionParams from '../src/utils/rekognition';
import * as dynamodbParams from '../src/utils/dynamodb';
import * as s3Params from '../src/utils/s3';

// Mock dependencies
jest.mock('../src/utils/rekognition');
jest.mock('../src/utils/dynamodb');
jest.mock('../src/utils/s3');
// Mock dependencies
jest.mock('../src/utils/rekognition');
jest.mock('../src/utils/dynamodb');
jest.mock('../src/utils/s3');
// Using real response utility
// jest.mock('../src/utils/response');

describe('matchFace', () => {
    const mockEvent = {
        queryStringParameters: {
            eventId: 'test_event_id',
        },
        headers: {
            'content-type': 'application/json',
        },
        body: 'base64encodedimage',
        isBase64Encoded: true,
    } as unknown as APIGatewayProxyEvent;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.REKOGNITION_COLLECTION_ID = 'test_collection';
        process.env.FACES_TABLE = 'faces_table';
        process.env.PHOTOS_TABLE = 'photos_table';
        process.env.RAW_PHOTOS_BUCKET = 'raw_photos_bucket';
    });

    it('should return 400 if eventId is missing', async () => {
        const event = { ...mockEvent, queryStringParameters: {} } as unknown as APIGatewayProxyEvent;
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.error).toContain('eventId');
    });

    it('should return empty matches if no faces found in Rekognition', async () => {
        (rekognitionParams.searchFacesByImage as jest.Mock).mockResolvedValue([]);
        const response = await handler(mockEvent);
        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body).matches).toEqual([]);
    });

    it('should match faces using in-memory map logic', async () => {
        // Mock Rekognition result
        (rekognitionParams.searchFacesByImage as jest.Mock).mockResolvedValue([
            {
                Face: { FaceId: 'rek_face_1' },
                Similarity: 99.9,
            },
        ]);

        // Mock DynamoDB Bulk Fetch
        (dynamodbParams.queryItems as jest.Mock).mockResolvedValue([
            {
                eventId: 'test_event_id',
                faceId: 'db_face_1',
                rekognitionFaceId: 'rek_face_1',
                associatedPhotos: ['photo_1', 'photo_2'],
            },
        ]);

        // Mock Photo Fetch
        (dynamodbParams.getItem as jest.Mock).mockImplementation((table, key) => {
            if (key.photoId === 'photo_1') return Promise.resolve({ photoId: 'photo_1', s3Key: 'key1' });
            if (key.photoId === 'photo_2') return Promise.resolve({ photoId: 'photo_2', s3Url: 'url2' }); /* no s3Key, existing url */
            return Promise.resolve(null);
        });

        // Mock S3 Signed URL
        (s3Params.getSignedUrlForDownload as jest.Mock).mockResolvedValue('signed_url_1');

        const response = await handler(mockEvent);
        const body = JSON.parse(response.body);

        expect(response.statusCode).toBe(200);
        expect(body.matches).toHaveLength(1);
        expect(body.matches[0].faceId).toBe('db_face_1');
        expect(body.matches[0].photos).toHaveLength(2);
        expect(body.matches[0].photos[0].s3Url).toBe('signed_url_1');
    });
});
