const { DynamoDBClient, UpdateItemCommand } = require("@aws-sdk/client-dynamodb");
const { marshall } = require("@aws-sdk/util-dynamodb");

async function run() {
    const client = new DynamoDBClient({ region: "eu-central-1" });
    const targetUserId = "e61b8fa6-6308-4e5f-810c-65ff6410fa80";
    try {
        await client.send(new UpdateItemCommand({
            TableName: "eventfacematch-users-dev",
            Key: marshall({ userId: targetUserId }),
            UpdateExpression: "SET eventCredits = :c, #p = :p, subscriptionStatus = :s",
            ExpressionAttributeNames: {
                "#p": "plan"
            },
            ExpressionAttributeValues: marshall({
                ":c": 10,
                ":p": "bundle_10",
                ":s": "active"
            })
        }));
        console.log("SUCCESS: Manually added 10 credits to user e61b8fa6-6308-4e5f-810c-65ff6410fa80");
    } catch (err) {
        console.error(err);
    }
}

run();
