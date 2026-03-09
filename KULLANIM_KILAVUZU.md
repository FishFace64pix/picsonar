# Fatura ve Admin Paneli Kullanım Kılavuzu

Bu kılavuz, geliştirdiğimiz fatura sistemi ve admin panelini nasıl çalıştırıp kullanacağınızı adım adım anlatır.

## 1. Backend Kurulumu ve Güncelleme (Sunucu Tarafı)

Yeni veritabanı tablolarının (Kullanıcılar ve Siparişler) oluşması için backend kodunu AWS'ye yüklememiz (deploy) gerekiyor.

1.  **Backend Klasörüne Git:**
    Terminalde (Komut Satırı) şu komutu yazarak backend klasörüne girin:
    ```bash
    cd backend
    ```
    *(Not: Eğer ana klasörde `serverless deploy` çalıştırırsanız hata alırsınız. Mutlaka `backend` klasöründe olmalısınız.)*

2.  **Deploy İşlemini Başlat:**
    Aşağıdaki komutu çalıştırın:
    ```bash
    serverless deploy --stage dev
    ```

3.  **Giriş Yapma (Eğer Sorulursa):**
    Eğer terminal sizden *Login/Register* isterse, yön tuşlarıyla "Login/Register" seçeneğine gelip Enter'a basın. Tarayıcı açılacaktır, oradan giriş yapın. Giriş yaptıktan sonra terminaldeki işlem otomatik devam edecektir.

4.  **Başarılı Bitiş:**
    İşlem bittiğinde ekranda `Stack Output` başlığı altında API adreslerini göreceksiniz. Bu, sunucunun hazır olduğunu gösterir.

## 2. Frontend Kurulumu (Kullanıcı Arayüzü)

1.  **Frontend Klasörüne Git:**
    Yeni bir terminal açın (veya mevcut olanda geri gelin) ve frontend klasörüne girin:
    ```bash
    cd frontend
    ```

2.  **Uygulamayı Başlat:**
    ```bash
    npm run dev
    ```
    Bu komut uygulamayı `http://localhost:5173` adresinde başlatacaktır.

## 3. Sistem Nasıl Kullanılır?

### Adım 1: Kullanıcı Kaydı ve Fatura Bilgileri
1.  Tarayıcıda `http://localhost:5173` adresine gidin.
2.  **Register** (Kayıt Ol) sayfasına gidin ve yeni bir üyelik oluşturun. (Eski üyelikler silinmiş olabilir, yeniden kayıt olun).
3.  Giriş yaptıktan sonra sağ üstteki menüden **Profile** sayfasına gidin.
4.  Sayfanın altında **Billing Information (Romania)** kutusunu göreceksiniz.
5.  Buraya şirket bilgilerinizi (Firma Adı, CUI, Reg Com, Adres, Banka, IBAN) girin ve **Save Billing Info** butonuna basın.

### Adım 2: Admin Paneli ve Faturalar
1.  Admin paneline ulaşmak için tarayıcının adres çubuğuna şunu yazın:
    `http://localhost:5173/admin/invoices`
2.  Burada sistemdeki tüm siparişleri tarih sırasına göre görebilirsiniz.
3.  Tabloda kimin sipariş verdiği, tutar ve **Şirket Bilgileri** yer alır.
4.  **View Invoice** butonuna basarak o siparişe ait basit faturayı görüntüleyebilirsiniz.

## Sorun Giderme
*   **Hata:** "serverless command not found"
    *   **Çözüm:** `npm install -g serverless` komutuyla yükleme yapın.
*   **Hata:** "No configuration file found"
    *   **Çözüm:** Yanlış klasördesiniz demektir. `cd backend` komutuyla backend klasörüne girdiğinizden emin olun.
