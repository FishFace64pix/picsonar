# PicSonar (EventFaceMatch) — Tam Proje Dokümantasyonu

> **Ürün Adı:** PicSonar  
> **Teknik Repo Adı:** EventFaceMatch  
> **Domain:** picsonar.com  
> **Son Güncelleme:** Mart 2026

---

## İçindekiler

1. [Proje Genel Bakış](#1-proje-genel-bakış)
2. [Kullanılan Teknolojiler](#2-kullanılan-teknolojiler)
3. [Sistem Mimarisi](#3-sistem-mimarisi)
4. [Veritabanı Şeması (DynamoDB Tabloları)](#4-veritabanı-şeması-dynamodb-tabloları)
5. [Depolama (S3 Buckets)](#5-depolama-s3-buckets)
6. [Backend — API Endpoint Listesi](#6-backend--api-endpoint-listesi)
7. [Backend — Yardımcı Fonksiyonlar (Utils)](#7-backend--yardımcı-fonksiyonlar-utils)
8. [Frontend — Sayfalar ve Arayüz Tasarımı](#8-frontend--sayfalar-ve-arayüz-tasarımı)
9. [Frontend — Bileşenler (Components)](#9-frontend--bileşenler-components)
10. [Fiyatlandırma Paketleri](#10-fiyatlandırma-paketleri)
11. [Ödeme Sistemi (Stripe)](#11-ödeme-sistemi-stripe)
12. [E-posta Sistemi (AWS SES)](#12-e-posta-sistemi-aws-ses)
13. [Yüz Tanıma Akışı (AWS Rekognition)](#13-yüz-tanıma-akışı-aws-rekognition)
14. [Kullanıcı Rolleri ve Yetkilendirme](#14-kullanıcı-rolleri-ve-yetkilendirme)
15. [Dil Desteği (i18n)](#15-dil-desteği-i18n)
16. [GDPR ve Yasal Belgeler](#16-gdpr-ve-yasal-belgeler)
17. [Admin Paneli](#17-admin-paneli)
18. [Dağıtım (Deployment)](#18-dağıtım-deployment)
19. [Ortam Değişkenleri](#19-ortam-değişkenleri)
20. [Test Altyapısı](#20-test-altyapısı)

---

## 1. Proje Genel Bakış

**PicSonar**, düğün ve etkinlik fotoğrafçıları için tasarlanmış bir **yapay zeka destekli yüz eşleştirme ve fotoğraf dağıtım platformudur.**

### Ne Yapar?

- Fotoğrafçı etkinlik galerilerini platforma yükler.
- AWS Rekognition sistemi her fotoğraftaki yüzleri otomatik olarak indeksler.
- Misafirler QR kodu okutarak selfie çeker, sistem **anında** misafirin bulunduğu tüm fotoğrafları bulur.
- Fotoğrafçılar bu özelliği düğün paketlerine **premium eklenti** olarak ekleyerek etkinlik başına **+300–700 RON** ek gelir elde eder.

### Hedef Kitle

| Segment | Açıklama |
|---|---|
| Fotoğrafçılar | Düğün/etkinlik galerilerini AI ile sunmak isteyenler |
| Misafirler | Kendi fotoğraflarını saniyeler içinde bulmak isteyenler |
| Ajanslar | Birden fazla etkinliği yönetenler, white-label sunanlar |

---

## 2. Kullanılan Teknolojiler

### Frontend

| Teknoloji | Versiyon | Kullanım Amacı |
|---|---|---|
| **React** | 18.2.0 | UI framework |
| **TypeScript** | 5.2.2 | Tip güvenliği |
| **Vite** | 5.0.8 | Build tool & geliştirme sunucusu |
| **TailwindCSS** | 3.3.6 | Stil sistemi |
| **React Router DOM** | 6.20.0 | Sayfa yönlendirme |
| **TanStack React Query** | 5.x | Server state yönetimi |
| **Axios** | 1.6.2 | HTTP istekleri |
| **i18next** | 25.x | Çok dil desteği |
| **react-i18next** | 16.x | React i18n entegrasyonu |
| **i18next-browser-languagedetector** | 8.x | Otomatik dil algılama |
| **i18next-http-backend** | 3.x | JSON dil dosyalarını yükleme |
| **@stripe/react-stripe-js** | 5.4.1 | Stripe ödeme UI |
| **@stripe/stripe-js** | 8.5.3 | Stripe JS SDK |
| **react-webcam** | 7.2.0 | Webcam/selfie yakalama |
| **browser-image-compression** | 2.0.2 | Yükleme öncesi resim sıkıştırma |
| **jszip** | 3.10.1 | Fotoğraf ZIP indirmesi |
| **qrcode** | 1.5.3 | QR kod oluşturma |
| **uuid** | 13.x | Unique ID üretimi |
| **Vitest** | 2.x | Birim testleri |

### Backend

| Teknoloji | Versiyon | Kullanım Amacı |
|---|---|---|
| **Node.js** | 20.x (runtime) | Sunucu tarafı dil |
| **TypeScript** | 5.2.2 | Tip güvenliği |
| **Serverless Framework** | 3.38.0 | Lambda dağıtımı |
| **serverless-esbuild** | 1.56.x | TypeScript bundle |
| **serverless-offline** | 13.3.0 | Yerel geliştirme |
| **AWS Lambda** | — | Serverless fonksiyonlar |
| **AWS API Gateway** | — | HTTP katmanı |
| **AWS DynamoDB** | SDK v3 | NoSQL veritabanı |
| **AWS S3** | SDK v3 | Fotoğraf depolama |
| **AWS Rekognition** | SDK v3 | Yüz tanıma AI |
| **AWS SES** | SDK v3 | E-posta gönderimi |
| **AWS X-Ray** | — | Tracing & monitoring |
| **Stripe** | 20.0.0 | Ödeme işlemleri |
| **Jimp** | 1.6.0 | Sunucu tarafı resim işleme |
| **Zod** | 4.x | Giriş doğrulama (validasyon) |
| **lambda-multipart-parser** | 1.0.1 | Form-data ayrıştırma |
| **Jest** | 30.x | Backend testleri |

### Altyapı

| Servis | Kullanım |
|---|---|
| **AWS Frankfurt (eu-central-1)** | Tüm servisler bu bölgede |
| **AWS CloudFormation** | Serverless Framework ile IaC |
| **AWS IAM** | Lambda rol ve izinleri |

---

## 3. Sistem Mimarisi

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React/Vite)                  │
│              picsonar.com  (Static Hosting)               │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS / REST API
┌──────────────────────────▼──────────────────────────────┐
│              AWS API Gateway (REST API)                   │
│           eu-central-1 — Binary: multipart/form-data     │
└──────────────────────────┬──────────────────────────────┘
                           │ Invoke
┌──────────────────────────▼──────────────────────────────┐
│               AWS Lambda Functions (Node 20.x)            │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────┐   │
│  │  Auth funcs  │ │ Event funcs  │ │  Admin funcs   │   │
│  │  login/reg   │ │ create/get   │ │ stats/users    │   │
│  │  forgot/reset│ │ upload/match │ │ finance/logs   │   │
│  └──────────────┘ └──────────────┘ └────────────────┘   │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────┐   │
│  │ Order funcs  │ │Payment funcs │ │   Logo funcs   │   │
│  │ createOrder  │ │createIntent  │ │ getUploadUrl   │   │
│  │ getUserOrders│ │verifyPayment │ │                │   │
│  └──────────────┘ │stripeWebhook │ └────────────────┘   │
│                   └──────────────┘                       │
└─────┬──────────────────────────────────────────────┬────┘
      │                                              │
┌─────▼─────┐  ┌──────────────┐  ┌──────────────────▼────┐
│ DynamoDB  │  │  AWS S3      │  │   AWS Rekognition      │
│ 7 Tablo   │  │  2 Bucket    │  │   Face Collection      │
└───────────┘  └──────┬───────┘  └───────────────────────┘
                      │ s3:ObjectCreated → processPhoto Lambda
                      └──────────────────────────────────────
```

### Fotoğraf İşleme Akışı

```
Fotoğrafçı Yükler
      │
      ▼
uploadPhoto Lambda → S3 (raw-photos bucket)
      │
      ▼ (S3 event trigger)
processPhoto Lambda
      │
      ├─ AWS Rekognition: DetectFaces + IndexFaces
      ├─ DynamoDB: Photos tablosuna kayıt
      └─ DynamoDB: Faces tablosuna yüz verileri
      
Misafir Selfie Çeker
      │
      ▼
matchFace Lambda → SearchFacesByImage (Rekognition)
      │
      └─ Eşleşen fotoğrafların S3 presigned URL'lerini döndür
```

---

## 4. Veritabanı Şeması (DynamoDB Tabloları)

> Tüm tablolar `PAY_PER_REQUEST` modundadır. Bölge: `eu-central-1`.

### 4.1 `eventfacematch-events-{stage}`

| Alan | Tip | Açıklama |
|---|---|---|
| `eventId` | String (PK) | Benzersiz etkinlik ID |
| `userId` | String (GSI) | Sahibi olan kullanıcı |
| `name` | String | Etkinlik adı |
| `createdAt` | Number | Oluşturulma zamanı (epoch) |
| `photoCount` | Number | Toplam fotoğraf sayısı |
| `faceCount` | Number | İndekslenen yüz sayısı |
| `expiresAt` | Number | Otomatik silme tarihi (epoch, TTL) |

**GSI:** `userId-index` — userId üzerinden kullanıcının etkinliklerini listeler.

---

### 4.2 `eventfacematch-faces-{stage}`

| Alan | Tip | Açıklama |
|---|---|---|
| `faceId` | String (PK) | Rekognition FaceId |
| `eventId` | String (GSI) | Hangi etkinliğe ait |
| `photoId` | String | Hangi fotoğrafta |
| `s3Key` | String | S3 nesne anahtarı |
| `confidence` | Number | Yüz algılama güven skoru |

**GSI:** `eventId-index`

---

### 4.3 `eventfacematch-photos-{stage}`

| Alan | Tip | Açıklama |
|---|---|---|
| `photoId` | String (PK) | Benzersiz fotoğraf ID |
| `eventId` | String (GSI) | Hangi etkinliğe ait |
| `s3Key` | String | Ham fotoğrafın S3 yolu |
| `uploadedAt` | Number | Yükleme zamanı |
| `faceCount` | Number | Bu fotoğraftaki yüz sayısı |
| `processed` | Boolean | AI işleminden geçti mi |

**GSI:** `eventId-index`

---

### 4.4 `eventfacematch-users-{stage}`

| Alan | Tip | Açıklama |
|---|---|---|
| `userId` | String (PK) | Benzersiz kullanıcı ID |
| `email` | String (GSI) | E-posta adresi |
| `passwordHash` | String | Şifrelenmiş parola |
| `name` | String | Ad Soyad |
| `role` | String | `user` veya `admin` |
| `credits` | Number | Kullanılabilir etkinlik kredisi |
| `package` | String | Satın alınan paket (`starter/studio/agency`) |
| `logoUrl` | String | White-label logo URL'i |
| `billingData` | Object | Fatura bilgileri |
| `resetToken` | String (GSI) | Şifre sıfırlama token'ı |
| `resetTokenExpiry` | Number | Token son kullanma tarihi |
| `createdAt` | Number | Kayıt tarihi |

**GSI:** `email-index`, `resetToken-index`

---

### 4.5 `eventfacematch-orders-{stage}`

| Alan | Tip | Açıklama |
|---|---|---|
| `orderId` | String (PK) | Benzersiz sipariş ID (= `paymentIntentId`) |
| `userId` | String (GSI) | Siparişi veren kullanıcı |
| `packageId` | String | Ana paket: `starter` \| `studio` \| `agency`<br>Ek kredi: `extra_5` \| `extra_10` \| `extra_15` |
| `amount` | Number | Ödeme tutarı (bani cinsinden — 1 RON = 100 bani) |
| `status` | String | `PAID` \| `pending` \| `failed` |
| `invoiceStatus` | String | `pending` \| `issued` \| `failed` |
| `invoiceSnapshot` | Object | Ödeme anındaki fatura verisi (değişmez kayıt) |
| `paymentIntentId` | String | Stripe PaymentIntent ID (orderId ile aynı) |
| `createdAt` | Number | Sipariş tarihi |

**GSI:** `userId-index`

---

### 4.6 `eventfacematch-system-stats-{stage}`

| Alan | Tip | Açıklama |
|---|---|---|
| `statsId` | String (PK) | İstatistik kaydı ID |
| `date` | String | YYYY-MM-DD |
| `totalUsers` | Number | Toplam kullanıcı sayısı |
| `totalEvents` | Number | Toplam etkinlik sayısı |
| `totalPhotos` | Number | Toplam fotoğraf sayısı |
| `totalRevenue` | Number | Toplam gelir |

---

### 4.7 `eventfacematch-audit-logs-{stage}`

| Alan | Tip | Açıklama |
|---|---|---|
| `logId` | String (PK) | Log kaydı ID |
| `timestamp` | Number (GSI) | İşlem zamanı |
| `action` | String | Gerçekleştirilen işlem |
| `userId` | String | İşlemi yapan kullanıcı |
| `details` | Object | İşlem detayları |
| `ip` | String | IP adresi |

**GSI:** `timestamp-index`

---

## 5. Depolama (S3 Buckets)

| Bucket | Adı | Erişim | İçerik |
|---|---|---|---|
| **Ham Fotoğraflar** | `eventfacematch-raw-photos-{stage}-x92k` | Private | Yüklenen orijinal fotoğraflar |
| **Yüz Indeks** | `eventfacematch-face-index-{stage}-x92k` | Private | İşlenmiş yüz verileri |

Her iki bucket da **tam olarak kapalı** (BlockPublicAcls, BlockPublicPolicy, IgnorePublicAcls, RestrictPublicBuckets = true).

Fotoğraflara erişim **S3 Presigned URL** ile sağlanır (varsayılan süre: 3600 saniye = 1 saat).

> [!WARNING]
> **S3 Lifecycle Policy tanımlı değil.** `serverless.yml`'de S3 bucket resource tanımlarında `LifecycleConfiguration` konfigürasyonu bulunmamaktadır.
> 
> DynamoDB'de `expiresAt` TTL kaydı vardır ve kayıtları otomatik siler — ancak **S3'teki fiziksel fotoğraf dosyaları silinmez.** Süresi dolan etkinliklerin fotoğrafları S3'te sonsuza kadar kalır.
> 
> **İki sorun:**
> 1. **GDPR:** Süresi dolan veri fiziksel olarak silinmemiş olur — GDPR Madde 5(1)(e) ihlali riski
> 2. **Maliyet:** S3 Standard depolama ücreti birikeir
> 
> **Önerilen düzeltme:** `serverless.yml`'e lifecycle rule ekle veya `expiresAt` TTL işlemi tetiklendiğinde S3 dosyalarını silen bir Lambda stream fonksiyonu yaz.

---

## 6. Backend — API Endpoint Listesi

### 6.1 Kimlik Doğrulama (Auth)

| Method | Path | Fonksiyon | Açıklama |
|---|---|---|---|
| POST | `/auth/register` | `auth/register` | Yeni kullanıcı kaydı |
| POST | `/auth/login` | `auth/login` | Giriş, JWT döndürür |
| GET | `/auth/me` | `auth/me` | Mevcut oturum bilgileri |
| PUT | `/auth/profile` | `auth/updateProfile` | Profil güncelleme |
| POST | `/auth/forgot-password` | `auth/forgotPassword` | Şifre sıfırlama e-postası gönder |
| POST | `/auth/reset-password` | `auth/resetPassword` | Token ile şifre sıfırla |

### 6.2 Etkinlik (Event)

| Method | Path | Fonksiyon | Açıklama |
|---|---|---|---|
| POST | `/event` | `createEvent` | Yeni etkinlik oluştur |
| GET | `/events` | `getEvents` | Kullanıcının etkinliklerini listele |
| GET | `/event/{eventId}` | `getEvent` | Etkinlik detayı |
| POST | `/event/{eventId}/upload` | `uploadPhoto` | Fotoğraf yükle |
| GET | `/event/{eventId}/photos` | `getEventPhotos` | Etkinlik fotoğraflarını listele |
| DELETE | `/event/{eventId}/photos/{photoId}` | `deletePhoto` | Tek fotoğraf sil |
| POST | `/event/{eventId}/photos/delete-batch` | `deletePhotos` | Toplu fotoğraf sil |
| GET | `/event/{eventId}/faces` | `getEventFaces` | Etkinlik yüzlerini listele |

### 6.3 Yüz Eşleştirme

| Method | Path | Fonksiyon | Açıklama |
|---|---|---|---|
| POST | `/match-face` | `matchFace` | Selfie ile yüz eşleştir, fotoğrafları bul |

### 6.4 Siparişler & Ödeme

| Method | Path | Fonksiyon | Açıklama |
|---|---|---|---|
| POST | `/orders` | `createOrder` | Sipariş oluştur |
| GET | `/orders/me` | `getUserOrders` | Kullanıcının siparişleri |
| POST | `/payment/create-intent` | `createPaymentIntent` | Stripe PaymentIntent oluştur |
| POST | `/payment/verify` | `verifyPayment` | Ödeme sonucunu doğrula |
| POST | `/payment/webhook` | `stripeWebhook` | Stripe webhook (CORS kapalı) |

### 6.5 Kullanıcı

| Method | Path | Fonksiyon | Açıklama |
|---|---|---|---|
| GET | `/user/logo-upload-url` | `logo/getUploadUrl` | S3 logo yükleme URL'i (presigned) |

### 6.6 İletişim & GDPR

| Method | Path | Fonksiyon | Açıklama |
|---|---|---|---|
| POST | `/contact` | `sendContactEmail` | İletişim formu e-postası gönder |
| POST | `/consent` | `logConsent` | GDPR onay kaydı |

### 6.7 Admin (Yönetim)

| Method | Path | Fonksiyon | Açıklama |
|---|---|---|---|
| GET | `/admin/stats` | `admin/getAdminStats` | Sistem istatistikleri |
| GET | `/admin/users` | `admin/getUsers` | Tüm kullanıcıları listele |
| POST | `/admin/users/manage` | `admin/manageUser` | Kullanıcı yönet (ban/unban/kredi) |
| GET | `/admin/events` | `admin/getEvents` | Tüm etkinlikleri listele |
| POST | `/admin/events/manage` | `admin/manageEvent` | Etkinlik yönet |
| GET | `/admin/finance` | `admin/getFinance` | Finans raporları |
| GET | `/admin/logs` | `admin/getSystemLogs` | Sistem logları |
| GET | `/admin/orders` | `getOrders` | Tüm siparişleri listele |
| GET | `/admin/settings` | `admin/getSettings` | Sistem ayarları |
| POST | `/admin/settings` | `admin/updateSettings` | Sistem ayarlarını güncelle |

---

## 7. Backend — Yardımcı Fonksiyonlar (Utils)

### `src/utils/rekognition.ts`

| Fonksiyon | Açıklama |
|---|---|
| `ensureCollection(collectionId)` | Rekognition collection yoksa oluşturur |
| `detectFacesInS3(bucket, key)` | S3'teki fotoğraflarda yüz tespiti |
| `indexFaces(collectionId, bucket, key, maxFaces)` | Yüzleri collection'a indeksler |
| `searchFacesByImage(collectionId, imageBytes)` | Selfie ile eşleşen yüzleri arar (eşik: %80, maks 10 sonuç) |
| `getS3Object(bucket, key)` | S3'ten dosya okur (Buffer) |
| `getSignedS3Url(bucket, key, expiresIn)` | Presigned URL üretir (varsayılan 1 saat) |
| `deleteFaces(collectionId, faceIds)` | Yüzleri collection'dan siler |
| `deleteCollection(collectionId)` | Collection'ı tamamen siler |

### `src/utils/dynamodb.ts`

DynamoDB istemcisi ve CRUD sarmalayıcıları. `@aws-sdk/client-dynamodb` + `@aws-sdk/util-dynamodb` kullanır.

### `src/utils/email.ts`

| Fonksiyon | Açıklama |
|---|---|
| `sendResetPasswordEmail(email, token)` | AWS SES aracılığıyla şifre sıfırlama e-postası gönderir. Gönderen: `hello@picsonar.com`. Link 1 saat geçerlidir. |

### `src/utils/s3.ts`

S3 yükleme ve silme işlemleri için sarmalayıcılar.

### `src/utils/audit.ts`

Denetim kaydı (audit log) oluşturma işlemleri.

### `src/utils/validateCUI.ts`

Romanya vergi numarası (CUI/CIF) doğrulama algoritması. Checksum hesaplama dahildir.

### `src/utils/validation.ts`

Genel giriş doğrulama yardımcıları (Zod şemaları).

### `src/utils/response.ts`

Lambda yanıt formatı sarmalayıcısı. CORS başlıkları otomatik eklenir.

---

## 8. Frontend — Sayfalar ve Arayüz Tasarımı

### 8.1 Genel Rotalar

| URL | Bileşen | Açıklama |
|---|---|---|
| `/` | `LandingPage` | Ana sayfa (pazarlama) |
| `/login` | `LoginPage` | Giriş |
| `/register` | `RegisterPage` | Kayıt |
| `/forgot-password` | `ForgotPasswordPage` | Şifre sıfırlama isteği |
| `/reset-password` | `ResetPasswordPage` | Şifre sıfırlama (token ile) |
| `/dashboard` | `DashboardPage` | Kullanıcı ana paneli |
| `/event/:eventId` | `EventPage` | Etkinlik yönetimi |
| `/guest/:eventId` | `GuestScanPage` | Misafir selfie tarama (public) |
| `/pricing` | `PricingPage` | Fiyatlandırma |
| `/checkout` | `CheckoutPage` | Satın alma akışı |
| `/profile` | `ProfilePage` | Profil & fatura bilgileri |
| `/contact` | `ContactPage` | İletişim formu |
| `/privacy` | `PrivacyPage` | Gizlilik politikası |
| `/terms` | `TermsPage` | Kullanım şartları |
| `/dpa` | `DPAPage` | Veri İşleme Anlaşması (DPA) |
| `/subprocessors` | `SubprocessorsPage` | Alt işleyiciler listesi |
| `/admin/invoices` | `AdminInvoicesPage` | Fatura yönetimi |
| `*` | `NotFoundPage` | 404 sayfası |

### 8.2 Admin Rotalar

| URL | Bileşen | Açıklama |
|---|---|---|
| `/admin/dashboard` | `AdminDashboardPage` | Genel istatistikler |
| `/admin/users` | `AdminUsersPage` | Kullanıcı yönetimi |
| `/admin/events` | `AdminEventsPage` | Etkinlik yönetimi |
| `/admin/finance` | `AdminFinancePage` | Finans / gelir raporu |
| `/admin/logs` | `AdminSecurityPage` | Güvenlik logları |
| `/admin/security` | `AdminSecurityPage` | (aynı sayfa, kısa yol) |
| `/admin/storage` | `AdminStoragePage` | Depolama kullanımı |
| `/admin/face-usage` | `AdminFaceUsagePage` | Yüz tanıma kullanım istatistikleri |
| `/admin/settings` | `AdminSettingsPage` | Sistem ayarları |

---

### 8.3 Sayfa Detayları

#### `/` — Landing Page (Ana Sayfa)

**Hedef:** Fotoğrafçıları platforma çekmek.

**Bölümler:**
- **Hero (İki sekme):**
  - *Fotoğrafçılar için:* "Add AI Face Search to Your Wedding Packages" — +300–700 RON ek gelir mesajı, Demo CTA butonu
  - *Misafirler için:* "Find Your Photos. In Seconds, Not Hours." — Ücretsiz galeri CTA butonu
- **Özellikler:** No App Download · No Login Required · Instant Results
- **Nasıl Çalışır (3 Adım):**
  1. Galeriyi Yükle — AI dakikalar içinde binlerce fotoğrafı indeksler
  2. Selfie Çek — QR kodu tara, selfie çek, fotoğraflarını bul
  3. Upsell & Kazan — Premium paket olarak sat
- **White Label Bölümü:** Logo, özel domain, PicSonar markalama gizlenir
- **Fiyatlandırma Özeti:** 3 paket kartı

---

#### `/dashboard` — Dashboard (Kullanıcı Paneli)

**Erişim:** Giriş yapmış kullanıcılar

**İçerik:**
- Mevcut kredi sayısı göstergesi
- İstatistik kartları: Toplam Fotoğraf · İndekslenen Yüz · Misafir Aramaları · Potansiyel Gelir
- **Başarı Kontrol Listesi:** İlk etkinliği oluştur → Fotoğraf yükle → AI indeksleme tamamlandı
- Etkinlik kartları listesi (her biri: isim, tarih, fotoğraf sayısı, yüz sayısı)
- **Yeni Etkinlik Oluştur** modal
- Kredi yoksa uyarı: "No Event Credits. Please buy a bundle."

---

#### `/event/:eventId` — Event Page (Etkinlik Yönetimi)

**Erişim:** Etkinliğin sahibi olan kullanıcı

**İçerik:**
- Etkinlik adı ve QR kodu görüntüle / indir
- Fotoğraf yükleme alanı (`PhotoUpload` bileşeni)
- Yüklenen fotoğraflar galerisi (ızgara düzen)
- Fotoğraf silme (tekil ve toplu)
- İndeksleme durumu göstergesi
- **Misafir Linki:** `/guest/:eventId` QR kodu ile kopyalanabilir URL

---

#### `/guest/:eventId` — Guest Scan Page (Misafir Selfie Sayfası)

**Erişim:** Herkese açık (public) — giriş gerektirmez!

**Akış:**
1. GDPR onay ekranı (rıza alınır, `POST /consent` ile loglanır)
2. Webcam ile selfie çekme (`WebcamCapture` bileşeni)
3. `POST /match-face` çağrısı
4. Eşleşen fotoğraflar ızgara düzeninde gösterilir
5. Toplu ZIP indirme seçeneği

---

#### `/checkout` — Checkout Page (Satın Alma)

**2 Adımlı Akış:**

**Adım 1 — Fatura Bilgileri:**
- Firma Adı, CUI/CIF (Romanya vergi no doğrulamalı), KDV mükellefi seçimi
- Ülke, Şehir, Adres, Posta Kodu
- Fatura e-postası, Oda sicil no, Banka, IBAN
- CUI doğrulama anlık (validateCUI algoritması)

**Adım 2 — Ödeme:**
- Stripe Elements UI (kart formu)
- Güvenlik rozeti: Secure Payment · 256-BIT ENCRYPTION · EU Hosted (AWS Frankfurt) · GDPR Compliant

---

#### `/profile` — Profile Page (Profil Sayfası)

**Bölümler:**
- Kullanıcı bilgileri düzenleme
- Logo yükleme (S3 presigned URL ile)
- Fatura bilgilerini güncelleme (`BillingDataForm` bileşeni)
- Sipariş geçmişi görüntüleme (`OrderHistoryModal`)
- Şifre değiştirme
- Hesap silme

---

#### `/pricing` — Pricing Page

3 paket kartı yan yana: Starter · Studio (Most Popular) · Agency  
Her kart için fiyat, özellik listesi ve Seç butonu.

---

#### `/admin/dashboard` — Admin Dashboard

- Toplam kullanıcı, etkinlik, fotoğraf, gelir istatistikleri
- Son dönem büyüme grafikleri
- Sistem sağlığı göstergeleri

---

#### `/admin/users` — Admin Users Page

- Tüm kullanıcıların tablosu
- Arama ve filtreleme
- Kullanıcı ban/unban işlemi
- Manuel kredi ekleme/çıkarma

---

#### `/admin/events` — Admin Events Page

- Tüm etkinliklerin listesi
- Etkinlik silme / durdurma
- Fotoğraf ve yüz sayısı görünümü

---

#### `/admin/finance` — Admin Finance Page

- Ödeme geçmişi
- Paket başına gelir dağılımı
- Toplam gelir ve bekleyen ödemeler

---

#### `/admin/logs` — Admin Security/Logs Page

- Audit log tablosu
- Timestamp bazlı filtreleme
- Kullanıcı eylemleri kaydı

---

#### `/admin/storage` — Admin Storage Page

- S3 bucket kullanım istatistikleri
- Bucket başına boyut bilgisi

---

#### `/admin/face-usage` — Admin Face Usage Page

- Rekognition kullanım metrikleri
- İndeksleme başarı oranları

---

#### `/admin/settings` — Admin Settings Page

- Sistem geneli ayarlar (paket sınırları, özellik flag'leri)
- E-posta ayarları

---

#### `/admin/invoices` — Admin Invoices Page

- Tüm siparişlerin fatura listesi
- Fatura detayı görüntüleme

---

## 9. Frontend — Bileşenler (Components)

| Bileşen | Dosya | Açıklama |
|---|---|---|
| **Navbar** | `Navbar.tsx` | Üst navigasyon. Giriş durumuna göre değişir. Mobil hamburger menü destekler. |
| **Footer** | `Footer.tsx` | Alt bilgi: linkler (Privacy, Terms, DPA, Subprocessors, Contact) |
| **BillingDataForm** | `BillingDataForm.tsx` | Fatura bilgileri formu. CUI doğrulama, KDV toggle, ülke seçimi (Romanya/Diğer) |
| **PhotoUpload** | `PhotoUpload.tsx` | Drag & drop + dosya seç ile fotoğraf yükleme. Browser image compression öncesinde sıkıştırır. |
| **WebcamCapture** | `WebcamCapture.tsx` | react-webcam ile selfie yakalama. Kamera seçimi, çekim butonu. |
| **BuyExtraEventModal** | `BuyExtraEventModal.tsx` | Ek etkinlik kredisi satın alma modalı |
| **OrderHistoryModal** | `OrderHistoryModal.tsx` | Geçmiş siparişleri listeleyen modal |
| **ErrorBoundary** | `ErrorBoundary.tsx` | React hata sınır bileşeni |

---

## 10. Fiyatlandırma Paketleri

> Fiyatlar `createPaymentIntent.ts` Lambda kaynak kodundan alınmıştır (bani → RON dönüşümü yapılmıştır).

### Ana Paket Karşılaştırması

| Özellik | Starter | Studio | Agency |
|---|---|---|---|
| **Fiyat** | **149 RON** | **799 RON** | **2,499 RON** |
| **Ödeme Türü** | Tek seferlik | Tek seferlik | Tek seferlik |
| **Etkinlik Kredisi** | 1 | 4 | 12 |
| **Maks. Fotoğraf/Etkinlik** | 1,000 | 2,500 | 5,000 |
| **Depolama Süresi** | 2 ay | 6 ay | 12 ay |
| **White Label** | ❌ | ✅ (logo) | ✅ (logo + hesap yöneticisi) |
| **Destek** | Standart | Öncelikli | Premium + Hesap Yöneticisi |
| **Kredi Başına Maliyet** | 149 RON | ~200 RON | ~208 RON |
| **En Popüler** | — | ✅ | — |

---

### Ek Kredi Paketleri (Dinamik — Plana Göre Fiyatlandırma)

Kullanıcının **aktif planına** (`user.plan`) göre fiyat değişir. Bu yapı `createPaymentIntent.ts`'de `switch/case` ile uygulanmıştır.

#### Starter Planı Kullananlar İçin Ek Kredi

| Paket ID | Kredi | Fiyat | Kredi Başına Maliyet |
|---|---|---|---|
| `extra_5` | 5 kredi | **600 RON** | 120 RON/kredi |
| `extra_10` | 10 kredi | **1,000 RON** | 100 RON/kredi |
| `extra_15` | 15 kredi | **1,350 RON** | 90 RON/kredi |

#### Studio Planı Kullananlar İçin Ek Kredi

| Paket ID | Kredi | Fiyat | Kredi Başına Maliyet |
|---|---|---|---|
| `extra_5` | 5 kredi | **1,050 RON** | 210 RON/kredi |
| `extra_10` | 10 kredi | **1,950 RON** | 195 RON/kredi |
| `extra_15` | 15 kredi | **2,775 RON** | 185 RON/kredi |

#### Agency Planı Kullananlar İçin Ek Kredi

| Paket ID | Kredi | Fiyat | Kredi Başına Maliyet |
|---|---|---|---|
| `extra_5` | 5 kredi | **2,750 RON** | 550 RON/kredi |
| `extra_10` | 10 kredi | **5,000 RON** | 500 RON/kredi |
| `extra_15` | 15 kredi | **7,125 RON** | 475 RON/kredi |

> [!IMPORTANT]
> **Ek kredi ile açılan etkinliğin limiti hangi planı takip eder?**
> Backend `packages.ts` sabitinde `extra_event`: 3,000 fotoğraf/etkinlik, 6 ay depolama **olarak tanımlıdır.**
> 
> Ancak `createPaymentIntent.ts`'de bu krediler kullanıcının aktif planına göre fiyatlanır; limit ise `PACKAGES['extra_event']` sabitindeki değerler uygulanır.
> 
> **Sonuç:** Starter kullanıcısı extra_5 satın aldığında açacağı etkinlikler **3,000 fotoğraf / 6 ay** limiti ile gelir — kendi ana plan limiti olan 1,000'den BAĞIMSIZ. Bu bilinçli bir karar ise kod ve doküman tutarlı; aksi hâlde `createEvent.ts` içindeki limit mantığı gözden geçirilmeli.

---

### Önerilen Upsell (Fotoğrafçı → Kendi Müşterisine)

| PicSonar Paketi | Önerilen Satış Fiyatı |
|---|---|
| Starter | 149 RON / kredi |
| Studio | ~200 RON / kredi |
| Agency | ~208 RON / kredi |

---

## 10.5 Rate Limiting (Hız Sınırlama)

> [!CAUTION]
> **Mevcut durumda API Gateway seviyesinde throttling konfigürasyonu yapılmamıştır.** `serverless.yml` dosyasında `throttle` veya `usagePlan` tanımı yoktur. AWS API Gateway'in varsayılan account-wide limitleri geçerlidir (10,000 req/s, burst 5,000).

### Kritik Risk: `/match-face` Endpoint

`POST /match-face` endpoint'i:
- **Halka açıktır** — giriş veya API key gerektirmez
- Her çağrıda **AWS Rekognition `SearchFacesByImage`** API'si tetiklenir (ücretli: $0.001/görüntü)
- Kötüye kullanım veya bot trafiği durumunda maliyet hızla artar

### Önerilen Düzeltmeler

| Önlem | Uygulama Yöntemi | Öncelik |
|---|---|---|
| API Gateway Usage Plan + API Key | `serverless.yml`'e `usagePlan` ve `apiKeys` ekle | 🔴 Yüksek |
| IP bazlı rate limiting | Lambda Authorizer veya WAF kuralı | 🟡 Orta |
| GDPR onay token doğrulama | `POST /consent` sonrası token → `/match-face`'e zorunlu kıl | 🟡 Orta |
| CAPTCHA | Frontend'de Cloudflare Turnstile veya reCAPTCHA v3 | 🟢 Düşük |

---

## 11. Ödeme Sistemi (Stripe)

### Akış

```
1. Kullanıcı paketi seçer → /checkout sayfasına yönlenir
2. Fatura bilgileri doldurulur + CUI doğrulanır (backend + frontend)
3. POST /payment/create-intent → Stripe PaymentIntent oluşturulur
   - Fatura verileri Stripe metadata'ya gömülür
   - Miktar bani cinsinden (1 RON = 100 bani)
4. Stripe Elements UI ile kart ödeme (Step 2)
5. Ödeme tamamlanır → POST /payment/verify
   - Stripe API'den PaymentIntent durumu doğrudan sorgulanır
   - status === 'succeeded' ise kredi eklenir, sipariş oluşturulur
6. Stripe Webhook (POST /payment/webhook) → asenkron ikincil işlem
   - payment_intent.succeeded eventi dinlenir
   - İdempotency kontrolü: sipariş zaten işlendi mi kontrol edilir
   - Fatura kaydı oluşturulur (şu an: invoiceStatus = 'pending')
```

### ⚠️ Kritik: Çifte Kredi (Double Credit) Riski

> [!CAUTION]
> **`verifyPayment.ts` Lambda'sında idempotency kontrolü yoktur.** Şu an `POST /payment/verify` çağrıldığında:
> 1. Stripe API'den `status === 'succeeded'` doğrulanır
> 2. **Kontrol yapılmadan** `eventCredits += X` DynamoDB güncelleme çalışır
> 3. Sipariş `putItem` ile oluşturulur (aynı `orderId` gelirse DynamoDB'de üzerine yazar)
>
> **Senaryo:** Kullanıcı `/payment/verify`'ı iki kez çağırırsa (ağ hatası/retry) kredi iki kez eklenir.
>
> **Webhook'ta ise idempotency VAR:** `stripeWebhook.ts` önce `getItem(ORDERS_TABLE, { orderId })` kontrolü yapar, `invoiceStatus !== 'pending'` ise işlemi atlar.
>
> **Önerilen düzeltme:** `verifyPayment.ts`'e de `getItem` ile sipariş kontrolü eklenmelidir:
> ```typescript
> const existing = await getItem(ORDERS_TABLE, { orderId: paymentIntentId })
> if (existing) return successResponse({ success: true, alreadyProcessed: true })
> ```

### Güvenlik

- Stripe Secret Key: Lambda ortam değişkeni
- Webhook Secret: `STRIPE_WEBHOOK_SECRET` ortam değişkeni
- Webhook endpoint'i CORS'suz (sadece Stripe IP'lerinden)
- 256-bit şifreleme
- AWS Frankfurt (eu-central-1) bölgesinde barındırılır

---

## 12. E-posta Sistemi (AWS SES)

| Parametre | Değer |
|---|---|
| **Gönderen** | `hello@picsonar.com` |
| **Destek e-postası** | `support@picsonar.com` |
| **Servis** | AWS SES (eu-central-1) |
| **Şifre sıfırlama linki** | 1 saat geçerlidir |

### Gönderilen E-postalar

| Şablon | Tetikleyici | Alıcı |
|---|---|---|
| Şifre Sıfırlama | `POST /auth/forgot-password` | Kullanıcı |
| İletişim Formu | `POST /contact` | Destek ekibi |

---

## 13. Yüz Tanıma Akışı (AWS Rekognition)

### Fotoğraf Yükleme → İndeksleme

```
1. uploadPhoto Lambda → fotoğraf S3'e yüklenir
2. S3 event (ObjectCreated) → processPhoto Lambda tetiklenir
3. detectFacesInS3() → tüm yüzler tespit edilir
4. indexFaces() → her yüz collection'a eklenir
   - QualityFilter: AUTO
   - DetectionAttributes: ALL
5. DynamoDB: Faces ve Photos tabloları güncellenir
```

### Misafir Arama

```
1. Misafir selfie çeker
2. matchFace Lambda: SearchFacesByImage()
   - FaceMatchThreshold: 80% (min. %80 benzerlik)
   - MaxFaces: 10 (en fazla 10 eşleşme)
3. Eşleşen FaceId'ler → DynamoDB'den photoId'ler çekilir
4. S3 Presigned URL'ler oluşturulur (1 saat geçerli)
5. Frontend'e fotoğraf URL'leri döndürülür
```

### Collection Yönetimi

- Her `stage` için ayrı collection: `eventfacematch-collection-{stage}`
- `ensureCollection()`: İlk kullanımda otomatik oluşturur
- Etkinlik silindiğinde yüzler collection'dan da kaldırılır (`deleteFaces()`)

### processPhoto Hata Yönetimi

> [!WARNING]
> **processPhoto Lambda'sında ciddi hata yönetimi eksiklikleri var:**
>
> | Senaryo | Mevcut Davranış | İdeal Davranış |
> |---|---|---|
> | Rekognition başarısız | `throw error` → Lambda hata verir | Retry + DLQ |
> | Thumbnail oluşturma hatası | `catch` ile sessizce geçilir | Log yeterli ✅ |
> | Photo DB kaydı bulunamazsa | `continue` ile atlanır | Log yeterli ✅ |
> | Genel hata fırlarsa | S3 event tekrar tetiklenir (Lambda retry) | Maks. 2 retry sonra kayıp |
>
> **DLQ (Dead Letter Queue) tanımlı değil** — `serverless.yml`'de processPhoto fonksiyonuna `destinations.onFailure` veya SQS DLQ eklenmemiştir.
>
> **Kullanıcıya bildirim yok** — Fotoğraf işlenemezse `processed: false` kalır ama fotoğrafçıya e-posta/hata mesajı gönderilmez.
>
> **Önerilen düzeltme:** `serverless.yml`'e DLQ ekle ve `processed: false` kalan fotoğraflar için dashboard'da görünür bir uyarı göster.

---

## 14. Kullanıcı Rolleri ve Yetkilendirme

| Rol | Açıklama | Erişilebilir Alanlar |
|---|---|---|
| `user` | Normal fotoğrafçı | Dashboard, Event, Profile, Checkout |
| `admin` | Platform yöneticisi | Tüm `/admin/*` sayfaları + normal kullanıcı alanları |

### JWT Kimlik Doğrulama ✅ (Uygulandı)

Token sistemi `jsonwebtoken` kütüphanesi ile gerçek JWT'ye geçirildi.

| Özellik | Değer |
|---|---|
| **Algoritma** | HS256 |
| **TTL** | 24 saat |
| **İmzalama Anahtarı** | `JWT_SECRET` ortam değişkeni |
| **Payload** | `{ userId, role, iat, exp }` |
| **Kaynak** | `backend/src/utils/jwt.ts` |

**Güncellenmiş Lambda'lar:**
- `auth/login.ts` — `signToken(userId, role)` ile JWT üretir
- `auth/register.ts` — `signToken(userId, 'user')` ile JWT üretir
- `auth/me.ts` — `verifyAuthHeader()` ile JWT doğrular
- `auth/updateProfile.ts` — `verifyAuthHeader()` ile JWT doğrular
- `payment/createPaymentIntent.ts` — `verifyAuthHeader()` ile JWT doğrular
- `createEvent.ts` — `verifyAuthHeader()` ile JWT doğrular (userId artık body'den değil token'dan alınır)

> [!IMPORTANT]
> **Production dağıtımından önce** `JWT_SECRET` ortam değişkeni güçlü rastgele bir değerle değiştirilmelidir:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```
> Bu değer hem `backend/.env` hem de AWS Lambda ortam değişkenlerine ayrı ayrı tanımlanmalıdır.

> [!NOTE]
> **Refresh token mekanizması yoktur.** 24 saat sonra kullanıcı otomatik olarak çıkış yapacaktır. Frontend `AuthContext`'i bu durumu yakalayıp login sayfasına yönlendirmelidir.


---

## 15. Dil Desteği (i18n)

### Desteklenen Diller

| Dil | Kod | Durum |
|---|---|---|
| İngilizce | `en` | ✅ Tamamlandı |
| Romanca | `ro` | ✅ Tamamlandı |

### Teknik Yapı

- **Kütüphane:** `i18next` + `react-i18next`
- **Dil Dosyaları:** `/frontend/public/locales/{lang}/translation.json`
- **Otomatik Algılama:** `i18next-browser-languagedetector` (tarayıcı dilini okur)
- **Yükleme:** `i18next-http-backend` (lazy loading)
- **Yapılandırma:** `/frontend/src/i18n.ts`

### Çevrilen Bölümler

| Anahtar | İçerik |
|---|---|
| `navbar.*` | Navigasyon bağlantıları |
| `landing.*` | Ana sayfa tüm içeriği |
| `packages.*` | Paket adları, özellikler, fiyatlar |
| `dashboard.*` | Dashboard tüm metinler |
| `pricingPage.*` | Fiyatlandırma sayfası |
| `checkout.*` | Ödeme akışı |
| `billingForm.*` | Fatura formu |

---

## 16. GDPR ve Yasal Belgeler

| Sayfa | URL | İçerik |
|---|---|---|
| **Gizlilik Politikası** | `/privacy` | Kişisel veri işleme kuralları |
| **Kullanım Şartları** | `/terms` | Hizmet kullanım koşulları |
| **Veri İşleme Anlaşması** | `/dpa` | B2B DPA (GDPR Madde 28) |
| **Alt İşleyiciler** | `/subprocessors` | AWS, Stripe vs. alt işleyici listesi |

### GDPR Onay Mekanizması

- Misaifir tarama sayfasında (`/guest/:eventId`) önce GDPR onay ekranı gösterilir
- Onay verildiğinde `POST /consent` çağrısı yapılır
- `logConsent` Lambda onayı DynamoDB'ye kaydeder (denetim için)

### Veri Saklama

- Fotoğraflar paket süresince saklanır (2, 6, veya 12 ay)
- `expiresAt` alanı DynamoDB TTL ile otomatik silme sağlar
- Kullanıcı hesap silme isteğinde tüm veriler temizlenir

---

## 17. Admin Paneli

### Admin Dashboard

Sistem genelindeki kilit metriklerin özeti:

- Toplam kullanıcı sayısı
- Toplam etkinlik sayısı
- Yüklenen toplam fotoğraf
- Toplam gelir (RON)
- Büyüme trendleri

### Kullanıcı Yönetimi (`/admin/users`)

- Tüm kayıtlı kullanıcıların listesi
- Kullanıcı arama (e-posta, ad)
- **Eylemler:** Hesap askıya alma · Ban kaldırma · El ile kredi ekleme/çıkarma

### Etkinlik Yönetimi (`/admin/events`)

- Platform genelindeki tüm etkinlikler
- **Eylemler:** Etkinliği durdurma · Silme · Detay inceleme

### Finans (`/admin/finance`)

- Tüm ödemelerin listesi
- Paket bazında gelir dağılımı
- Başarılı/başarısız/bekleyen ödeme durumları

### Güvenlik / Loglar (`/admin/logs`)

- Denetim kaydı (kim ne zaman ne yaptı)
- IP adresi takibi
- Timestamp bazlı filtreleme

### Depolama (`/admin/storage`)

- S3 bucket kullanım durumu
- Bucket başına kullanılan alan

### Yüz Kullanımı (`/admin/face-usage`)

- Rekognition API çağrı sayısı ve maliyet tahmini
- İndeksleme başarı/hata oranları

> [!WARNING]
> **Backend endpoint yok.** Bu sayfa ayrı bir API çağrısı yapmaz; doğrudan `GET /admin/events` (= `adminApi.getEvents()`) sonucunu tüketir. Etkinliklerin `faceCount` ve `photoCount` alanlarından hesaplama yapar. Tahmini maliyet: `(totalFaces / 1000) * $1.00` (yaklaşık).
> 
> **Teknik borç:** İleride `/admin/face-usage` için ayrı bir Lambda endpoint oluşturulması, gerçek Rekognition API çağrı loglarını (CloudWatch Metrics) sunması önerilir.

### Fatura Yönetimi (`/admin/invoices`)

- Tüm siparişlerin fatura bilgileri
- İndirme seçenekleri

### Sistem Ayarları (`/admin/settings`)

- Paket limitleri güncelleme
- Özellik flag'leri (feature toggle)

---

## 18. Dağıtım (Deployment)

### Backend Dağıtımı

```bash
# Dev ortamı
cd backend
npm run deploy:dev

# Üretim ortamı
npm run deploy:prod
```

**Araçlar:** Serverless Framework v3 + esbuild bundle + AWS CloudFormation

**Bölge:** `eu-central-1` (Frankfurt)

**Aşamalar (stages):** `dev`, `prod`

### Frontend Dağıtımı

```bash
cd frontend
npm run build   # TypeScript + Vite build
```

Çıktı: `frontend/dist/` — herhangi bir statik hosting'e dağıtılabilir.

### Yerel Geliştirme

```bash
# Kök dizinde
npm run dev

# Backend (offline)
cd backend
npx serverless offline

# Frontend
cd frontend
npm run dev     # http://localhost:5173
```

---

## 19. Ortam Değişkenleri

### Backend (`backend/.env`)

| Değişken | Açıklama |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe gizli API anahtarı |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook imzalama sırrı |
| `SES_SENDER_EMAIL` | Gönderen e-posta (`hello@picsonar.com`) |
| `SUPPORT_EMAIL` | Destek e-postası (`support@picsonar.com`) |
| `FRONTEND_URL` | Frontend URL'i (CORS ve e-posta linkleri için) |

### Frontend (`frontend/.env`)

| Değişken | Açıklama |
|---|---|
| `VITE_API_URL` | Backend API Gateway URL'i |

### Serverless Framework Computed Değişkenler

| Değişken | Değer (prod) |
|---|---|
| `EVENTS_TABLE` | `eventfacematch-events-prod` |
| `FACES_TABLE` | `eventfacematch-faces-prod` |
| `PHOTOS_TABLE` | `eventfacematch-photos-prod` |
| `USERS_TABLE` | `eventfacematch-users-prod` |
| `ORDERS_TABLE` | `eventfacematch-orders-prod` |
| `RAW_PHOTOS_BUCKET` | `eventfacematch-raw-photos-prod-x92k` |
| `FACE_INDEX_BUCKET` | `eventfacematch-face-index-prod-x92k` |
| `REKOGNITION_COLLECTION_ID` | `eventfacematch-collection-prod` |
| `SYSTEM_STATS_TABLE` | `eventfacematch-system-stats-prod` |
| `AUDIT_LOGS_TABLE` | `eventfacematch-audit-logs-prod` |

---

## 20. Test Altyapısı

### Frontend Testleri

- **Framework:** Vitest + @testing-library/react
- **Yapılandırma:** `frontend/vitest.config.ts`
- **Çalıştır:** `cd frontend && npm test`

### Backend Testleri

- **Framework:** Jest + ts-jest
- **Yapılandırma:** `backend/jest.config.js`
- **Çalıştır:** `cd backend && npm test`
- **Sonuçlar:** `backend/test-results.json`

### Yerel API Testi

```bash
# Serverless offline ile Lambda'ları yerel test et
cd backend && npx serverless offline

# Manuel invoke
npx serverless invoke local -f {functionName} --path payload.json
```

---

## Notlar ve Mimari Kararlar

| Karar | Gerekçe |
|---|---|
| **Serverless (Lambda)** | Boyutlanabilirlik, kullanım bazlı maliyet, sıfır sunucu yönetimi |
| **DynamoDB** | Düşük gecikme, NoSQL esnekliği, Lambda ile sorunsuz entegrasyon |
| **S3 Private + Presigned URL** | Fotoğraflar hiçbir zaman herkese açık değil; her URL 1 saat geçerli |
| **AWS Rekognition** | Yönetilen AI servisi, kurulum gerektirmez, yüksek doğruluk |
| **Tek Rekognition Collection** | Stage başına bir collection; etkinlikler mantıksal olarak ayrılır |
| **Stripe (Stripe.js)** | PCI-DSS uyumlu, kart verileri hiçbir zaman sunucuya ulaşmaz |
| **React + Vite** | Hızlı geliştirme, TypeScript desteği, küçük bundle boyutu |
| **TailwindCSS** | Utility-first, tasarım tutarlılığı, küçük CSS çıktısı |
| **i18next** | Şu an EN + RO destekleniyor, ileride kolayca genişletilebilir |
| **PAY_PER_REQUEST DynamoDB** | Başlangıç aşamasında maliyet optimizasyonu |
| **eu-central-1 (Frankfurt)** | GDPR uyumluluğu için AB içi veri depolama zorunluluğu |

---

*Bu doküman otomatik olarak kaynak kodu analiz edilerek oluşturulmuştur.*  
*Proje: PicSonar (EventFaceMatch) — © 2026 PicSonar. Tüm hakları saklıdır.*
