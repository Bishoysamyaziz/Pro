<div align="center">

# 🚀 مستشاري | Mostasharai

### منصة الاستشارات المهنية العربية العالمية
**The Arab World's Premier Professional Consulting Platform**

![Next.js 15](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=nextdotjs)
![Firebase](https://img.shields.io/badge/Firebase-12-orange?style=flat-square&logo=firebase)
![Stream Video](https://img.shields.io/badge/Stream-Video_SDK-blue?style=flat-square)
![Gemini AI](https://img.shields.io/badge/Gemini-2.0_Flash-purple?style=flat-square&logo=google)

</div>

---

## ✨ الميزات الكاملة | Full Features

| الميزة | الوصف | Status |
|---|---|---|
| 🔐 المصادقة | Firebase Auth + Google Sign-in | ✅ |
| 👤 الخبراء | ملفات، تخصصات، حجز، تقييمات | ✅ |
| 🎥 فيديو مباشر | Stream Video SDK HD | ✅ |
| 💬 دردشة | Firestore real-time | ✅ |
| 📁 رفع ملفات | Firebase Storage | ✅ |
| 🤖 AI بوت | Gemini 2.0 Flash | ✅ |
| 🧠 ملخص ذكي | تحليل الجلسة بـ Gemini | ✅ |
| 📅 الجلسات | Live + Scheduled tracking | ✅ |
| 📱 الريلز | TikTok-style video feed | ✅ |
| 💰 المحفظة | عملة NEX + إيداع/سحب | ✅ |
| 🔔 الإشعارات | Push notifications فورية | ✅ |
| 🌓 Dark/Light | وضع ليلي ونهاري | ✅ |
| 🌍 ثنائي اللغة | عربي + إنجليزي | ✅ |
| 👑 لوحة المالك | غرفة عمليات كاملة | ✅ |

---

## 🚀 التشغيل السريع | Quick Start

```bash
# 1. Install dependencies
npm install

# 2. .env.local already configured — just run:
npm run dev

# 3. Open browser
# http://localhost:3000
```

---

## 🎥 إعداد Stream Video (مطلوب للفيديو)

1. أنشئ حساباً على [getstream.io](https://getstream.io)
2. أنشئ مشروع جديد → اختر "Video & Audio"
3. انسخ `API Key` و `Secret`
4. أضفهم في `.env.local`:
```env
NEXT_PUBLIC_STREAM_API_KEY=xxxxxxxxxxxxxx
STREAM_API_SECRET=xxxxxxxxxxxxxxxxxxxxxx
```

---

## 👑 إنشاء حساب المالك | Create Owner Account

```
1. سجّل حساباً عادياً على الموقع
2. Firebase Console → Firestore → users → [uid الخاص بك]
3. غيّر role من "user" إلى "admin_owner"
4. ادخل على /admin
```

---

## 🎮 أوامر غرفة العمليات | Control Room Commands

```bash
حظر @username           # Ban user
رفع حظر @username       # Unban user
ترقية @username         # Promote to expert
حذف منشور [postID]     # Delete post
موافقة إيداع [reqID]   # Approve deposit
إشعار "النص"           # Broadcast notification
رصيد @username 100     # Add NEX balance
```

---

## 🚀 النشر على Vercel | Deploy to Vercel

```bash
# 1. Push to GitHub
git init && git add . && git commit -m "🚀 Mostasharai v2"
git remote add origin https://github.com/YOUR/repo.git
git push -u origin main

# 2. vercel.com → New Project → Import repo
# 3. Add Environment Variables from .env.local
# 4. Deploy! ✅
```

---

## 🏗️ هيكل المشروع | Project Structure

```
app/
├── page.tsx              # Home (Feed + Reels)
├── experts/              # Expert directory
├── expert/[id]/          # Expert profile + Live Start
├── sessions/             # My Sessions (Live + Scheduled)
├── consultations/[id]/   # Full consultation (Video + Chat + Files + AI Summary)
├── profile/[id]/         # User profile
├── wallet/               # NEX wallet
├── login/ register/      # Auth pages
├── admin/                # Owner control room
└── api/
    ├── stream-token/     # Stream JWT generation
    └── analyze-session/  # Gemini session analysis

components/
├── Navigation.tsx         # Sidebar + Mobile nav + Theme toggle
├── AIAssistant.tsx        # Floating AI chat bot
├── PostCard.tsx           # Social post card
├── CommentSection.tsx     # Comments modal
├── VideoCard.tsx          # TikTok-style video
├── VideoCallRoom.tsx      # Stream Video room
├── FileUploader.tsx       # File sharing in sessions
├── NotificationBell.tsx   # Real-time notifications
└── SessionCompanionBot.tsx # In-session AI assistant

lib/
├── firebase.ts            # Firebase init
├── ai.adapter.ts          # Gemini AI
├── sessionAnalysis.ts     # Post-session analysis
└── database.adapter.ts    # Firestore operations

context/
├── AuthContext.tsx        # Auth state + Google login
└── ThemeContext.tsx       # Dark/Light mode

telemetry/
└── TelemetryProvider.tsx  # User event tracking
```

---

<div align="center">

Made with ❤️ for the Arab World 🌍

**مستشاري — حيث تتحول المعرفة إلى قيمة**

</div>
