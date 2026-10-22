# TLS/SSL Konfiguratsiya Qo'llanma

## 1. TLS versiyalari

Faqat TLS 1.2 va TLS 1.3 qo'llab-quvvatlanadi:

```nginx
ssl_protocols TLSv1.2 TLSv1.3;
```

TLS 1.0 va TLS 1.1 qattiq taqiqlangan (PCI DSS talabi).

---

## 2. Tavsiya etilgan Cipher Suite-lar

```nginx
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
```

---

## 3. SSL Sertifikati olish (Let's Encrypt)

```bash
# Certbot o'rnatish
sudo apt install certbot python3-certbot-nginx

# Sertifikat olish
sudo certbot --nginx -d nizolar.uz -d www.nizolar.uz -d admin.nizolar.uz

# Avtomatik yangilanish
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## 4. SSL Session kesh

```nginx
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 1d;
ssl_session_tickets off;
```

---

## 5. HSTS (HTTP Strict Transport Security)

```nginx
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
```

> [!WARNING]
> HSTS preload ro'yxatiga kirishdan oldin barcha subdomenlar HTTPS orqali ishlashiga ishonch hosil qiling.

---

## 6. OCSP Stapling

```nginx
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;
```

---

## 7. SSL/TLS sertifikatini tekshirish

```bash
# SSL konfiguratsiyani tekshirish
openssl s_client -connect admin.nizolar.uz:443 -tls1_2

# Sertifikat muddatini tekshirish
echo | openssl s_client -connect admin.nizolar.uz:443 2>/dev/null | openssl x509 -noout -dates

# Online tekshirish: https://www.ssllabs.com/ssltest/
```

---

## 8. Docker/Nginx uchun sertifikat joylashtirish

```
/etc/letsencrypt/live/nizolar.uz/
├── fullchain.pem   # Sertifikat + zanjir
├── privkey.pem     # Maxfiy kalit
├── cert.pem        # Faqat sertifikat
└── chain.pem       # Faqat zanjir
```

```yaml
# docker-compose.yml ichida
volumes:
  - /etc/letsencrypt:/etc/letsencrypt:ro
  - /var/www/certbot:/var/www/certbot:ro
```

---

## 9. Maqsad: SSL Labs A+ bahosi

Tavsiya etilgan konfiguratsiya bilan SSL Labs sinovida **A+** bahosi olinishi kerak.

Tekshirish: https://www.ssllabs.com/ssltest/analyze.html?d=admin.nizolar.uz
