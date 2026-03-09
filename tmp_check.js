const { DynamoDBClient, ScanCommand, UpdateItemCommand } = require("@aws-sdk/client-dynamodb");
const { unmarshall, marshall } = require("@aws-sdk/util-dynamodb");

async function run() {
    const client = new DynamoDBClient({ region: "eu-central-1" });
    try {
        const data = await client.send(new ScanCommand({
            TableName: "eventfacematch-users-dev"
        }));
        const users = data.Items.map(item => unmarshall(item));
        users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        console.log("Latest 5 users:");
        users.slice(0, 5).forEach(u => {
            console.log(`${u.email} - ${u.userId} - Credits: ${u.eventCredits || 0} - Plan: ${u.plan || 'none'}`);
        });

        // If you want me to manually fix a user, uncomment this:
        /*
        const targetUserId = "a5bbd1d4-999e-4028-88ce-7e28fe695a06"; // Batuhan
        await client.send(new UpdateItemCommand({
            TableName: "eventfacematch-users-dev",
            Key: marshall({ userId: targetUserId }),
            UpdateExpression: "SET eventCredits = :c, plan = :p, subscriptionStatus = :s",
            ExpressionAttributeValues: marshall({
                ":c": 10,
                ":p": "bundle_10",
                ":s": "active"
            })
        }));
        console.log("Updated user credits!");
        */
    } catch (err) {
        console.error(err);
    }
}

run();
