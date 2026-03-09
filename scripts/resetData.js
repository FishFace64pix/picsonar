const { DynamoDBClient, ScanCommand, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');
const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const { RekognitionClient, DeleteCollectionCommand, CreateCollectionCommand } = require('@aws-sdk/client-rekognition');

const REGION = 'eu-central-1';
const STAGE = 'dev';

const ddbClient = new DynamoDBClient({ region: REGION });
const s3Client = new S3Client({ region: REGION });
const rekClient = new RekognitionClient({ region: REGION });

const TABLES = [
    { name: `eventfacematch-users-${STAGE}`, key: 'userId' },
    { name: `eventfacematch-events-${STAGE}`, key: 'eventId' },
    { name: `eventfacematch-photos-${STAGE}`, key: 'photoId' },
    { name: `eventfacematch-faces-${STAGE}`, key: 'faceId' },
    { name: `eventfacematch-orders-${STAGE}`, key: 'orderId' },
    { name: `eventfacematch-system-stats-${STAGE}`, key: 'statsId' },
    { name: `eventfacematch-audit-logs-${STAGE}`, key: 'logId' }
];

const BUCKETS = [
    `eventfacematch-raw-photos-${STAGE}-x92k`,
    `eventfacematch-face-index-${STAGE}-x92k`
];

const COLLECTION_ID = `eventfacematch-collection-${STAGE}`;

async function clearTable(tableName, keyName) {
    console.log(`Clearing table: ${tableName}`);
    try {
        let lastEvaluatedKey = undefined;
        let count = 0;
        do {
            const scanOutput = await ddbClient.send(new ScanCommand({
                TableName: tableName,
                ExclusiveStartKey: lastEvaluatedKey,
            }));

            const items = scanOutput.Items || [];
            for (const item of items) {
                await ddbClient.send(new DeleteItemCommand({
                    TableName: tableName,
                    Key: {
                        [keyName]: item[keyName]
                    }
                }));
                count++;
            }
            lastEvaluatedKey = scanOutput.LastEvaluatedKey;
        } while (lastEvaluatedKey);
        console.log(`Deleted ${count} items from ${tableName}`);
    } catch (err) {
        if (err.name === 'ResourceNotFoundException') {
            console.log(`Table ${tableName} not found (skipped).`);
        } else {
            console.error(`Error clearing table ${tableName}:`, err.message);
        }
    }
}

async function emptyBucket(bucketName) {
    console.log(`Emptying bucket: ${bucketName}`);
    try {
        let listParams = { Bucket: bucketName };
        let listOutput;
        let count = 0;
        do {
            listOutput = await s3Client.send(new ListObjectsV2Command(listParams));
            if (listOutput.Contents && listOutput.Contents.length > 0) {
                const deleteParams = {
                    Bucket: bucketName,
                    Delete: { Objects: listOutput.Contents.map(c => ({ Key: c.Key })) }
                };
                await s3Client.send(new DeleteObjectsCommand(deleteParams));
                count += listOutput.Contents.length;
            }
            listParams.ContinuationToken = listOutput.NextContinuationToken;
        } while (listOutput.IsTruncated);
        console.log(`Deleted ${count} objects from ${bucketName}`);
    } catch (err) {
        if (err.name === 'NoSuchBucket') {
            console.log(`Bucket ${bucketName} not found (skipped).`);
        } else {
            console.error(`Error emptying bucket ${bucketName}:`, err.message);
        }
    }
}

async function resetRekognition() {
    console.log(`Resetting Rekognition Collection: ${COLLECTION_ID}`);
    try {
        await rekClient.send(new DeleteCollectionCommand({ CollectionId: COLLECTION_ID }));
        console.log(`Deleted collection ${COLLECTION_ID}`);
    } catch (err) {
        if (err.name === 'ResourceNotFoundException') {
            console.log(`Collection ${COLLECTION_ID} not found, proceeding to create...`);
        } else {
            console.error(`Error deleting collection ${COLLECTION_ID}:`, err.message);
        }
    }

    try {
        await rekClient.send(new CreateCollectionCommand({ CollectionId: COLLECTION_ID }));
        console.log(`Created collection ${COLLECTION_ID}`);
    } catch (err) {
        console.error(`Error creating collection ${COLLECTION_ID}:`, err.message);
    }
}

async function main() {
    console.log('--- STARTING COMPLETE DATA RESET ---');
    for (const table of TABLES) {
        await clearTable(table.name, table.key);
    }
    for (const bucket of BUCKETS) {
        await emptyBucket(bucket);
    }
    await resetRekognition();
    console.log('--- DATA RESET COMPLETED SUCCESSFULLY ---');
}

main().catch(console.error);
