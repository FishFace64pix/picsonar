// scripts/addCredits.js
// Run this with: node scripts/addCredits.js <email> <amount>
// Example: node scripts/addCredits.js test@example.com 10
// Requires AWS credentials to be configured in your environment

const { DynamoDBClient, ScanCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');

const REGION = 'eu-central-1';
const USERS_TABLE = 'eventfacematch-users-dev'; // Using dev stage for testing

const client = new DynamoDBClient({ region: REGION });

async function addCredits(email, amountStr) {
    if (!email || !amountStr) {
        console.error('Usage: node scripts/addCredits.js <email> <amount>');
        process.exit(1);
    }

    const amount = parseInt(amountStr, 10);
    if (isNaN(amount)) {
        console.error('Amount must be a number.');
        process.exit(1);
    }

    try {
        console.log(`Scanning for user with email: ${email}...`);

        // 1. Scan to find user ID
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
        console.log(`Found user: ${user.userId} (${user.email}) - Current Credits: ${user.eventCredits || 0}`);

        // 2. Add Credits
        const updateCmd = new UpdateItemCommand({
            TableName: USERS_TABLE,
            Key: marshall({ userId: user.userId }),
            UpdateExpression: 'SET eventCredits = if_not_exists(eventCredits, :zero) + :inc',
            ExpressionAttributeValues: marshall({
                ':inc': amount,
                ':zero': 0
            })
        });

        await client.send(updateCmd);
        console.log(`Successfully added ${amount} credits. Total: ${(user.eventCredits || 0) + amount}`);

    } catch (err) {
        console.error('Error:', err);
    }
}

const args = process.argv.slice(2);
addCredits(args[0], args[1]);
