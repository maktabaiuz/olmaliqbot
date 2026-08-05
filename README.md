# 🚀 "Kim bor?" — Shahar Ma'lumotnomasi Boti & Admin Paneli

Olmaliq va O'zbekiston shaharlari uchun mo'ljallangan ko'p shaharli (Multi-Tenant) Telegram boti, Fastify REST API backend, Gemini AI Copilot va Vite+React Web App boshqaruv paneli.

---

## 💻 VPS Serverya Qo'yiladigan Texnik Talablar (Hardware Sizing)

Loyihangizdagi barcha xizmatlar (**PostgreSQL, Redis, Fastify API, Telegram Bot, WebApp, Caddy TLS**) konteynerlarda parallel ishlashi uchun zaruriy resurslar hisob-kitobi:

| Xizmat / Servis | Operativ Xotira (RAM) | CPU yuklamasi |
|---|---|---|
| **PostgreSQL 16** | ~150 MB | Past |
| **Redis 7** | ~50 MB | Minimal |
| **Fastify API Server** | ~120 MB | O'rtacha |
| **grammY Telegram Bot** | ~100 MB | O'rtacha |
| **Caddy TLS Proxy** | ~40 MB | Minimal |
| **Tizim va Operatsion Tizim (Linux)** | ~250 MB | Minimal |
| **JAMI ENTIK HARAKAT** | **~710 MB RAM** | **1-2 Cores** |

### 🛠️ Tavsiya Etiladigan VPS Server Konfiguratsiyasi:
- **CPU**: 2 vCPU Cores
- **RAM (Xotira)**: **2 GB RAM** (yoki 4 GB ko'p shaharlarga kengaytirish uchun)
- **Disk (Xotira)**: **25 GB - 40 GB NVMe SSD**
- **OS**: Ubuntu 22.04 LTS yoki 24.04 LTS
- **Mo'ljallangan VPS narxi**: ~$5 — $10 / oyiga (DigitalOcean, Hetzner, Vultr)

---

## 🛠️ Serverya Birinchi Marta O'rnatish (Deployment)

1. **Repozitoriyani serverga klonlash**:
```bash
git clone https://github.com/maktabaiuz/kimbor.git
cd kimbor
```

2. **Konfiguratsiya faylini tayyorlash**:
```bash
cp .env.production.example .env
nano .env
```
`.env` fayliga domeningiz (`DOMAIN=kimbor.uz`), `BOT_TOKEN` va `GEMINI_API_KEY` ni kiriting.

3. **Docker konteynerlarini ishga tushirish**:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

4. **Ma'lumotlar bazasi migratsiyasi va Seed kiritish**:
```bash
docker exec -it kimbor_api npx prisma migrate deploy
docker exec -it kimbor_api npx tsx packages/db/prisma/seed.ts
```

---

## 🔄 Yangilash (Update Command)

Kodingizga yangi o'zgarishlar qo'shilganda serverni yangilash:

```bash
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 📦 Kunlik Zaxira Nusxa (Backup)

Baza zaxirasini kunlik avtomatik olish uchun `crontab`ga qo'shing:

```bash
crontab -e
```

Quyidagi qatorni kiriting (har kuni tunda soat 03:00 da zaxira oladi):
```text
0 3 * * * /bin/bash /root/kimbor/scripts/backup.sh >> /root/kimbor/backups/backup.log 2>&1
```

---

## 🔍 Loglarni Kuzatish va Diagnostika

```bash
# Barcha xizmatlar holati
docker compose -f docker-compose.prod.yml ps

# Real vaqtdagi loglar
docker compose -f docker-compose.prod.yml logs -f --tail=100
```
