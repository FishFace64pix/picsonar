// scripts/makeAdmin.js
// Run this with: node scripts/makeAdmin.js <email>
// Requires AWS credentials to be configured in your environment

const { DynamoDBClient, ScanCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');

const REGION = 'eu-central-1';
const USERS_TABLE = 'eventfacematch-users-dev'; // Correct table name found in serverless.yml

const client = new DynamoDBClient({ region: REGION });

async function makeAdmin(email) {
    if (!email) {
        console.error('Please provide an email address.');
        process.exit(1);
    }

    try {
        console.log(`Scanning for user with email: ${email}...`);

        // 1. Scan to find user ID (GSI Query is better but Scan is easier for a script without setup)
        const scanCmd = new ScanCommand({
            TableName: USERS_TABLE,
            FilterExpression: 'email = :email',
            ExpressionAttributeValues: marshall({ ':email': email })
        });

        const data = await client.send(scanCmd);

        if (data.Items.length === 0) {
            console.error('User not found.');
            process.exit(1);
        }

        const user = unmarshall(data.Items[0]);
        console.log(`Found user: ${user.userId} (${user.email})`);

        // 2. Update Role
        const updateCmd = new UpdateItemCommand({
            TableName: USERS_TABLE,
            Key: marshall({ userId: user.userId }),
            UpdateExpression: 'SET #r = :role',
            ExpressionAttributeNames: { '#r': 'role' },
            ExpressionAttributeValues: marshall({ ':role': 'admin' })
        });

        await client.send(updateCmd);
        console.log('Successfully promoted user to ADMIN.');

    } catch (err) {
        console.error('Error:', err);
    }
}

const emailArg = process.argv[2];
makeAdmin(emailArg);
