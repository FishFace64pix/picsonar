# EventFaceMatch - AI-Powered Event Photo Delivery System

A full-stack SaaS platform for event photographers to automatically distribute photos to guests using AWS Rekognition face recognition.

## 🚀 Hızlı Başlangıç

### 1. Bağımlılıkları Yükle
```bash
npm install
cd frontend && npm install && cd ..
cd backend && npm install --no-workspaces && cd ..
```

### 2. AWS Yapılandır
```bash
aws configure
aws rekognition create-collection --collection-id eventfacematch-collection-test --region eu-central-1
```

### 3. Backend Deploy
```bash
cd backend
# Önce IAM izinlerini ekleyin! (backend/REHBER.md)
serverless deploy --stage test
```

### 4. Frontend Yapılandır
```bash
cd frontend
echo "VITE_API_BASE_URL=https://your-api-url.execute-api.eu-central-1.amazonaws.com/test" > .env
npm run dev
```

## 📚 Dokümantasyon

- **Kurulum Rehberi:** `KURULUM_REHBERI.md` - Detaylı adım adım kurulum
- **Backend Rehberi:** `backend/REHBER.md` - Deployment, IAM izinleri, sorun giderme
- **Proje Yapısı:** `PROJECT_STRUCTURE.md` - Kod yapısı ve mimari
- **Hızlı Başlangıç:** `QUICKSTART.md` - Hızlı başlangıç rehberi
- **Deployment:** `DEPLOYMENT.md` - Production deployment rehberi

## 🏗️ Mimari

- **Frontend:** React + Vite + TypeScript + Tailwind CSS
- **Backend:** AWS Lambda (Serverless) + TypeScript
- **AWS Services:** S3, Rekognition, DynamoDB, API Gateway, CloudFront

## ✨ Özellikler

- ✅ Otomatik yüz tespiti ve indeksleme
- ✅ Kişi gruplama
- ✅ QR kod oluşturma
- ✅ Webcam ve fotoğraf yükleme ile yüz eşleştirme
- ✅ Fotoğraf galerisi

## 📝 Lisans

Private project
