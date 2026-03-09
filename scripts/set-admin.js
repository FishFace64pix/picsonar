/**
 * PicSonar — Admin Rolü Atama Script
 * Kullanim (proje root'undan):
 *   node scripts/set-admin.js batuhankamburgolu@hotmail.com
 */

const path = require('path')

// AWS SDK root node_modules'ten yukle
const sdkRoot = path.join(__dirname, '..', 'node_modules', '@aws-sdk')
const { DynamoDBClient, QueryCommand, UpdateItemCommand } = require(path.join(sdkRoot, 'client-dynamodb'))

// .env'i backend'den yukle
try {
    const dotenvPath = path.join(__dirname, '..', 'backend', 'node_modules', 'dotenv')
    require(dotenvPath).config({ path: path.join(__dirname, '..', 'backend', '.env') })
} catch (e) {
    // dotenv yoksa env var'lara guven
}

const REGION = process.env.REGION || 'eu-central-1'
const STAGE = process.env.STAGE || 'dev'
const USERS_TABLE = process.env.USERS_TABLE || `eventfacematch-users-${STAGE}`

const client = new DynamoDBClient({ region: REGION })

// DynamoDB marshaling yardimcilari (lib-dynamodb gerektirmeden)
function str(v) { return { S: v } }
function strVal(attr) { return attr && attr.S ? attr.S : null }

async function setAdmin(email) {
    if (!email) {
        console.error('\n❌  Kullanim:')
        console.error('    node scripts/set-admin.js senin@email.com')
        process.exit(1)
    }

    const normalizedEmail = email.toLowerCase().trim()
    console.log(`\n🔍  Kullanici aranıyor : ${normalizedEmail}`)
    console.log(`📦  Tablo              : ${USERS_TABLE}`)
    console.log(`🌍  Bolge              : ${REGION}`)

    // 1. email-index GSI ile kullaniciyi bul
    const queryResult = await client.send(new QueryCommand({
        TableName: USERS_TABLE,
        IndexName: 'email-index',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: { ':email': str(normalizedEmail) }
    }))

    if (!queryResult.Items || queryResult.Items.length === 0) {
        console.error(`\n❌  Kullanici bulunamadi: ${normalizedEmail}`)
        console.error('💡  Once uygulamaya bu e-posta ile kayit olundugundan emin olun.')
        process.exit(1)
    }

    const item = queryResult.Items[0]
    const userId = strVal(item.userId)
    const name = strVal(item.name)
    const role = strVal(item.role)

    console.log(`\n✅  Kullanici bulundu:`)
    console.log(`    Ad   : ${name}`)
    console.log(`    Email: ${normalizedEmail}`)
    console.log(`    ID   : ${userId}`)
    console.log(`    Rol  : ${role || 'user (tanimsiz)'}`)

    if (role === 'admin') {
        console.log('\nℹ️   Zaten admin. Islem gerekmiyor.')
        process.exit(0)
    }

    // 2. Rolu admin olarak guncelle
    await client.send(new UpdateItemCommand({
        TableName: USERS_TABLE,
        Key: { userId: str(userId) },
        UpdateExpression: 'SET #role = :admin',
        ExpressionAttributeNames: { '#role': 'role' },
        ExpressionAttributeValues: { ':admin': str('admin') }
    }))

    console.log(`\n🎉  Basarili! ${normalizedEmail} artik ADMIN.`)
    console.log('🔑  Uygulamada cikis yapip tekrar giris yapin (yeni JWT token icin).')
    console.log('🔗  Admin panel: http://localhost:5173/admin/dashboard\n')
}

setAdmin(process.argv[2]).catch(err => {
    console.error('\n❌  Hata:', err.message)
    if (err.name === 'CredentialsProviderError' || err.name === 'NoCredentialProvider' || err.Code === 'InvalidClientTokenId') {
        console.error('\n💡  AWS kimlik bilgileri bulunamadi veya gecersiz.')
        console.error('    >> aws configure   komutunu calistirin')
        console.error('    veya backend/.env dosyasina ekleyin:')
        console.error('    AWS_ACCESS_KEY_ID=...')
        console.error('    AWS_SECRET_ACCESS_KEY=...')
    }
    process.exit(1)
})
