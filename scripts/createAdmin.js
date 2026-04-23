/**
 * Admin Seed Script
 * DynamoDB'ye admin kullanıcısı ekler.
 *
 * Kullanım:
 *   node scripts/createAdmin.js
 *
 * Değiştirmek istersen: ADMIN_EMAIL ve ADMIN_PASSWORD değerlerini aşağıda düzenle.
 */

const { DynamoDBClient, PutItemCommand, QueryCommand } = require('@aws-sdk/client-dynamodb')
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb')
const bcrypt = require('bcryptjs')
const { v4: uuidv4 } = require('uuid')

// ─── Ayarlar ─────────────────────────────────────────────────
const ADMIN_EMAIL    = 'admin@picsonar.com'
const ADMIN_PASSWORD = 'Admin@PicSonar2026!'
const ADMIN_NAME     = 'PicSonar Admin'
const STAGE          = process.env.STAGE || 'dev'
const REGION         = process.env.REGION || 'eu-central-1'
const USERS_TABLE    = `eventfacematch-users-${STAGE}`
// ─────────────────────────────────────────────────────────────

const client = new DynamoDBClient({ region: REGION })

async function userExists(email) {
    const res = await client.send(new QueryCommand({
        TableName: USERS_TABLE,
        IndexName: 'email-index',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: marshall({ ':email': email })
    }))
    return res.Count > 0
}

async function createAdmin() {
    console.log(`\n🔧  Admin seed — Stage: ${STAGE} / Table: ${USERS_TABLE}\n`)

    const exists = await userExists(ADMIN_EMAIL)
    const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 12)
    const userId = uuidv4()

    if (exists) {
        // If user exists, we must fetch their existing userId to update it properly or just blindly overwrite.
        // But since we just need the password reset to bcrypt, we can update it via email index? 
        // No, email is GSI. We need to query the user to get userId.
        const res = await client.send(new QueryCommand({
            TableName: USERS_TABLE,
            IndexName: 'email-index',
            KeyConditionExpression: 'email = :email',
            ExpressionAttributeValues: marshall({ ':email': ADMIN_EMAIL })
        }))
        const existingUserId = unmarshall(res.Items[0]).userId;
        
        console.log(`⚠️  Admin zaten mevcut. Şifresi yeni güvenlik altyapısına (bcrypt) güncelleniyor...`);
        const { UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
        await client.send(new UpdateItemCommand({
            TableName: USERS_TABLE,
            Key: marshall({ userId: existingUserId }),
            UpdateExpression: 'SET password = :p',
            ExpressionAttributeValues: marshall({ ':p': passwordHash })
        }));
    } else {
        const adminUser = {
            userId,
            email: ADMIN_EMAIL,
            name: ADMIN_NAME,
            role: 'admin',
            password: passwordHash,
            createdAt: new Date().toISOString(),
            plan: 'agency',
            eventCredits: 999,
            subscriptionStatus: 'active',
            companyDetails: {}
        }

        await client.send(new PutItemCommand({
            TableName: USERS_TABLE,
            Item: marshall(adminUser),
            ConditionExpression: 'attribute_not_exists(userId)'
        }))
    }

    console.log('✅  Admin kullanıcısı oluşturuldu!\n')
    console.log('   📧  Email   :', ADMIN_EMAIL)
    console.log('   🔑  Şifre   :', ADMIN_PASSWORD)
    console.log('   🆔  UserId  :', userId)
    console.log('   👑  Role    : admin\n')
    console.log('⚡  Giriş için: http://localhost:3000/login\n')
}

createAdmin().catch(err => {
    console.error('❌  Hata:', err.message)
    process.exit(1)
})
