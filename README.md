# 🚀 Kim bor? — Shahar giper-mahalliy katalog platformasi

Ushbu loyiha **"Kim bor?"** shaharlararo katalog Telegram boti va Shahar Admin Paneli (Telegram Mini App) infratuzilmasidan iborat.

---

## 🛠 TIZIM VE SERVER MA'LUMOTLARI

- **Server IP:** `62.72.20.22`
- **Foydalanuvchi:** `root`
- **Domen:** `https://olmaliq.online`
- **Sinov va Preview Link:** `https://olmaliq.online/preview?key=kimbor_preview_sec_8f93a2`

---

## 💻 SERVERGA ULANISH (SSH)

```bash
ssh root@62.72.20.22
```

---

## 🔄 BIR BUYRUQ BILAN YANGILASH (ONE-COMMAND DEPLOY)

Loyiha kodlari yangilanganda serverda quyidagi skriptni yuritish kifoya:

```bash
/root/kimbor/scripts/deploy.sh
```

> **Avtomatik Rollback:** Agar yangi kodda kompilatsiya yoki HTTP xatosi chiqsa, skript avtomatik ravishda avvalgi barqaror versiyaga (git commit) qaytaradi.

---

## 📦 KUNLIK ZAXIRA (BACKUP & RESTORE)

### 1. Zaxira skripti
Zaxiralar `/root/kimbor/backups/` papkasida soat **03:00 da** avtomatik saqlanadi (oxirgi 30 kun saqlanadi):

```bash
# Qo'lda zaxira olish:
/root/kimbor/scripts/kimbor-backup.sh
```

### 2. Zaxiradan tiklash (Database Restore)
```bash
# Zaxiradagi .sql.gz faylidan PostgreSQL bazasini tiklash:
zcat /root/kimbor/backups/kimbor_2026-08-13_16-39-29.sql.gz | docker exec -i kimbor_postgres psql -U kimbor -d kimbor_prod_db
```

---

## 📊 KUZATUV VA MONITORING (HEALTH & LOGS)

### 1. Servislar holatini ko'rish
```bash
cd /root/kimbor && docker compose -f docker-compose.prod.yml ps
```

### 2. Loglarni tekshirish
```bash
# API loglari:
docker logs --tail 100 -f kimbor_api

# Telegram Bot loglari:
docker logs --tail 100 -f kimbor_bot

# WebApp loglari:
docker logs --tail 100 -f kimbor_webapp
```

### 3. Monitoring skripti
Har 5 daqiqada disk to'lishi va servislar holatini tekshiradi, muammo bo'lsa Telegram orqali Super-Adminga xabar yuboradi:
```bash
/root/kimbor/scripts/kimbor-monitor.sh
```
