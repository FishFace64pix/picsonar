# EventFaceMatch - Adım Adım Kurulum Rehberi

Bu rehber, EventFaceMatch uygulamasını sıfırdan kurmanız için gereken tüm adımları içerir.

## 📋 Ön Gereksinimler

Kuruluma başlamadan önce aşağıdakilerin yüklü olduğundan emin olun:

- ✅ Node.js 20.x veya üzeri
- ✅ npm veya yarn
- ✅ AWS CLI
- ✅ Git

### Node.js Kontrolü
```bash
node --version
# v20.x.x veya üzeri olmalı
```

### AWS CLI Kontrolü
```bash
aws --version
# AWS CLI v2.x.x olmalı
```

---

## 🔧 ADIM 1: Proje Bağımlılıklarını Yükle

### 1.1 Root Dizin Bağımlılıkları
```bash
# Proje kök dizininde
npm install
```

### 1.2 Frontend Bağımlılıkları
```bash
cd frontend
npm install
cd ..
```

### 1.3 Backend Bağımlılıkları
```bash
cd backend
npm install
cd ..
```

**✅ Kontrol:** Tüm `node_modules` klasörleri oluşturuldu mu?

---

## ☁️ ADIM 2: AWS Yapılandırması

### 2.1 AWS CLI Yapılandırması

AWS hesabınızı yapılandırın:
```bash
aws configure
```

Şunları girmeniz istenecek:
- **AWS Access Key ID:** [AWS Console'dan alın]
- **AWS Secret Access Key:** [AWS Console'dan alın]
- **Default region:** `us-east-1` (veya tercih ettiğiniz bölge)
- **Default output format:** `json`

**✅ Kontrol:** AWS kimlik bilgilerinizi test edin:
```bash
aws sts get-caller-identity
```

### 2.2 AWS Rekognition Collection Oluşturma

Rekognition collection'ı oluşturun:
```bash
aws rekognition create-collection \
  --collection-id eventfacematch-collection-dev \
  --region eu-central-1
```

**Not:** Stage adına göre collection ID değişebilir. Örneğin `test` stage için:
```bash
aws rekognition create-collection \
  --collection-id eventfacematch-collection-test \
  --region eu-central-1
```

**✅ Kontrol:** Collection oluşturuldu mu?
```bash
aws rekognition list-collections --region eu-central-1
```

---

## 🚀 ADIM 3: Backend Deployment (Serverless)

### 3.1 Serverless Framework Kurulumu

Global olarak Serverless Framework'ü yükleyin:
```bash
npm install -g serverless
```

**✅ Kontrol:**
```bash
serverless --version
```

### 3.2 Backend Environment Dosyası Oluştur

```bash
cd backend
cp .env.example .env
```

`.env` dosyasını düzenleyin (şimdilik varsayılan değerler yeterli, deployment sonrası güncellenecek).

### 3.3 Backend'i Deploy Et

**ÖNEMLİ:** Önce tüm AWS IAM izinlerini ekleyin! (Bkz: `backend/REHBER.md`)

```bash
cd backend
npm install --no-workspaces  # Workspace sorununu önlemek için
npm run deploy:dev
# veya farklı stage ile:
serverless deploy --stage test
```

**⏳ Bekleme Süresi:** 3-5 dakika sürebilir.

**📝 ÖNEMLİ:** Deployment tamamlandığında terminalde şu bilgileri göreceksiniz:
```
endpoints:
  POST - https://xxxxx.execute-api.eu-central-1.amazonaws.com/test/event
  GET - https://xxxxx.execute-api.eu-central-1.amazonaws.com/test/events
  ...
```

**Bu URL'yi kopyalayın!** (API Gateway URL'si)

**Not:** Eğer `test` stage kullandıysanız, URL'de `/test/` olacaktır.

**✅ Kontrol:** Deployment başarılı mı?
- Terminal'de hata var mı kontrol edin
- AWS Console'da Lambda fonksiyonları oluşturuldu mu?

---

## 🎨 ADIM 4: Frontend Yapılandırması

### 4.1 Frontend Environment Dosyası Oluştur

```bash
cd frontend
```

`.env` dosyası oluşturun:
```bash
echo "VITE_API_BASE_URL=https://xxxxx.execute-api.us-east-1.amazonaws.com/dev" > .env
```

**⚠️ ÖNEMLİ:** `https://xxxxx...` kısmını ADIM 3.3'te kopyaladığınız API Gateway URL'si ile değiştirin!

Örnek:
```bash
echo "VITE_API_BASE_URL=https://abc123xyz.execute-api.us-east-1.amazonaws.com/dev" > .env
```

**✅ Kontrol:** `.env` dosyası doğru mu?
```bash
cat .env
```

---

## 🏃 ADIM 5: Uygulamayı Çalıştır

### 5.1 Frontend Development Server

```bash
cd frontend
npm run dev
```

**✅ Kontrol:** Tarayıcıda `http://localhost:3000` açılıyor mu?

---

## 🧪 ADIM 6: İlk Test

### 6.1 Hesap Oluştur

1. Tarayıcıda `http://localhost:3000` açın
2. "Register" butonuna tıklayın
3. İsim, email ve şifre girin
4. "Register" butonuna tıklayın

**✅ Kontrol:** Dashboard sayfasına yönlendirildiniz mi?

### 6.2 İlk Event Oluştur

1. Dashboard'da "Create Event" butonuna tıklayın
2. Event adı girin (örn: "Test Event")
3. "Create" butonuna tıklayın

**✅ Kontrol:** Event sayfasına yönlendirildiniz mi?

### 6.3 Fotoğraf Yükle

1. Event sayfasında "Upload Photos" bölümüne gidin
2. Birkaç fotoğraf sürükleyip bırakın veya "browse" butonuna tıklayın
3. Upload progress'i izleyin

**⏳ Bekleme:** Fotoğrafların işlenmesi 1-2 dakika sürebilir.

**✅ Kontrol:** 
- Fotoğraflar yüklendi mi?
- "Detected People" bölümünde yüzler görünüyor mu? (işleme tamamlandıktan sonra)

### 6.4 QR Kodları Oluştur

1. "Detected People" bölümünde yüzler göründükten sonra
2. "Generate QR Codes" butonuna tıklayın
3. ZIP dosyası indirilecek

**✅ Kontrol:** QR kodları oluşturuldu mu?

### 6.5 Guest Flow Test Et

1. Event sayfasının altında "Guest Access" bölümünde linki kopyalayın
2. Yeni bir tarayıcı sekmesinde açın
3. "Use Camera" veya "Upload Photo" ile yüzünüzü tarayın
4. Eşleşen fotoğrafları görün

**✅ Kontrol:** Fotoğraflar görünüyor mu?

---

## 🔍 Sorun Giderme

### Problem: Backend deployment başarısız

**Çözüm:**
1. AWS kimlik bilgilerini kontrol edin: `aws sts get-caller-identity`
2. **TÜM IAM izinlerini kontrol edin:** `backend/REHBER.md` dosyasına bakın
3. Serverless Framework versiyonunu kontrol edin: `serverless --version`
4. Stack takılı kaldıysa farklı stage kullanın: `serverless deploy --stage test`

### Problem: Frontend API'ye bağlanamıyor

**Çözüm:**
1. `.env` dosyasındaki URL'yi kontrol edin
2. API Gateway URL'sinin doğru olduğundan emin olun
3. CORS ayarlarını kontrol edin (serverless.yml'de zaten yapılandırılmış)

### Problem: Fotoğraflar işlenmiyor

**Çözüm:**
1. CloudWatch Logs'u kontrol edin:
   ```bash
   aws logs tail /aws/lambda/eventfacematch-backend-dev-processPhoto --follow
   ```
2. S3 bucket trigger'ının doğru yapılandırıldığından emin olun
3. Lambda'nın S3 okuma izinlerini kontrol edin

### Problem: Yüz eşleştirme çalışmıyor

**Çözüm:**
1. Rekognition collection'ın var olduğunu kontrol edin
2. Yüzlerin indexlendiğini kontrol edin (DynamoDB Faces tablosu)
3. Fotoğraf kalitesini kontrol edin (minimum 80x80 piksel)

---

## 📊 Sonraki Adımlar

Kurulum tamamlandıktan sonra:

1. **Production Deployment:**
   - `npm run deploy:prod` ile production'a deploy edin
   - Custom domain yapılandırın

2. **AWS Cognito Entegrasyonu:**
   - Gerçek authentication için Cognito kullanın
   - Mock JWT token'ları değiştirin

3. **Monitoring:**
   - CloudWatch alarms kurun
   - Error tracking ekleyin (Sentry vb.)

4. **Optimizasyon:**
   - Presigned URL'ler ile direkt S3 upload
   - CloudFront CDN yapılandırması

---

## ✅ Kurulum Kontrol Listesi

- [ ] Node.js yüklü (v20+)
- [ ] AWS CLI yapılandırıldı
- [ ] Rekognition collection oluşturuldu
- [ ] Backend bağımlılıkları yüklendi
- [ ] Frontend bağımlılıkları yüklendi
- [ ] Backend deploy edildi
- [ ] Frontend .env dosyası yapılandırıldı
- [ ] Frontend çalışıyor (localhost:3000)
- [ ] İlk event oluşturuldu
- [ ] Fotoğraf yüklendi
- [ ] Yüzler tespit edildi
- [ ] QR kodları oluşturuldu
- [ ] Guest flow test edildi

---

## 🆘 Yardım

Sorun yaşıyorsanız:
1. CloudWatch Logs'u kontrol edin
2. Browser Console'da hataları kontrol edin
3. Network tab'inde API isteklerini kontrol edin

**Başarılar! 🎉**


