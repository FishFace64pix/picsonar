# EventFaceMatch Backend - Kapsamlı Rehber

## 📋 İçindekiler

1. [Deployment](#deployment)
2. [AWS IAM İzinleri](#aws-iam-izinleri)
3. [Sorun Giderme](#sorun-giderme)
4. [API Endpoints](#api-endpoints)

---

## 🚀 Deployment

### İlk Deployment

```powershell
cd backend
npm install --no-workspaces
npm run deploy:dev
```

### Farklı Stage ile Deploy

```powershell
serverless deploy --stage test
# veya
serverless deploy --stage prod
```

### Stack Silme

```powershell
serverless remove --stage test
```

---

## 🔐 AWS IAM İzinleri

### Gerekli Policy'ler

AWS Console → IAM → Users → `face-recognition-app` → "Add permissions"

**TÜM bu policy'leri ekleyin:**

1. ✅ `IAMFullAccess` - Lambda role'leri için
2. ✅ `CloudWatchLogsFullAccess` - Log groups için
3. ✅ `CloudFormationFullAccess` - Stack'ler için
4. ✅ `AWSLambda_FullAccess` - Lambda fonksiyonları için
5. ✅ `AmazonS3FullAccess` - S3 bucket'ları için
6. ✅ `AmazonDynamoDBFullAccess` - DynamoDB tabloları için
7. ✅ `AmazonRekognitionFullAccess` - Rekognition servisi için
8. ✅ `AmazonAPIGatewayAdministrator` - API Gateway için

**ÖNEMLİ:** Tüm policy'leri **önce** ekleyin, sonra deployment yapın. Aksi halde stack'ler takılı kalabilir.

---

## 🔧 Sorun Giderme

### Problem: Stack Takılı Kaldı

**Belirti:** `UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS` durumu

**Çözüm:**
1. Farklı bir stage kullanın: `serverless deploy --stage test`
2. Veya AWS Console'dan stack'i manuel olarak silin
3. Stack temizlendikten sonra (5-10 dakika) tekrar deneyin

### Problem: IAM İzin Hatası

**Belirti:** `is not authorized to perform: [action]`

**Çözüm:**
- Yukarıdaki tüm policy'leri ekleyin
- Policy'lerin eklendiğini kontrol edin: `aws iam list-attached-user-policies --user-name face-recognition-app`

### Problem: node_modules Bulunamıyor

**Çözüm:**
```powershell
cd backend
npm install --no-workspaces
```

### Problem: TypeScript Derleme Hatası

**Çözüm:**
- Eksik paketleri kontrol edin: `npm install`
- `package.json`'daki tüm bağımlılıkların yüklü olduğundan emin olun

---

## 📍 API Endpoints

**Base URL:** `https://p8kg2dizag.execute-api.eu-central-1.amazonaws.com/test`

### Events
- `POST /event` - Yeni event oluştur
- `GET /events` - Tüm event'leri listele
- `GET /event/{eventId}` - Event detayları

### Photos
- `POST /event/{eventId}/upload` - Fotoğraf yükle
- `GET /event/{eventId}/faces` - Tespit edilen yüzleri getir

### QR Codes
- `POST /event/{eventId}/generate-qr` - QR kodları oluştur

### Face Matching
- `POST /match-face?eventId={eventId}` - Yüz eşleştir

### Authentication
- `POST /auth/login` - Giriş yap
- `POST /auth/register` - Kayıt ol
- `GET /auth/me` - Kullanıcı bilgileri

---

## 📊 Oluşturulan AWS Kaynakları

- ✅ Lambda Functions (11 adet)
- ✅ API Gateway REST API
- ✅ DynamoDB Tables (Events, Faces, Photos)
- ✅ S3 Buckets (Raw Photos, Face Index, QR Codes)
- ✅ CloudWatch Log Groups

---

## 🎯 Hızlı Komutlar

```powershell
# Deploy
npm run deploy:dev
# veya
serverless deploy --stage test

# Logs görüntüle
serverless logs -f createEvent --tail

# Stack sil
serverless remove --stage test

# Stack durumu kontrol
aws cloudformation describe-stacks --stack-name eventfacematch-backend-test --region eu-central-1
```

---

## 📝 Notlar

- Development için `test` stage'i kullanılıyor
- Production için `prod` stage'i kullanılmalı
- Takılı stack'ler için farklı stage adı kullanın
- Tüm IAM izinlerini deployment öncesi ekleyin

