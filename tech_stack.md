# 🚀 Final Tech Stack — AI-Powered PDF Label Reader & Order Manager

---

## 🖥️ Frontend

- **Framework:** Next.js (React)
- **Styling:** Tailwind CSS + Shadcn UI
- **State Management:** Zustand
- **Icons:** Lucide-React

### 📱 Offline & Storage
- Service Workers (PWA)
- IndexedDB via `localforage`

---

## ⚙️ Backend

- **API Layer:** Next.js Route Handlers (Node.js)
- **Database:** PostgreSQL (Supabase / Neon)
- **ORM:** Prisma

---

## 🤖 AI Integration

- **Model:** Google Gemini 1.5 Flash
- **Capabilities:**
  - Multimodal PDF parsing
  - Structured JSON output via schema
  - Low temperature for high accuracy

---

## ⏳ Queue & Rate Limiting

- Inngest OR Upstash QStash
- Ensures sequential processing (~15 RPM limit)

---

## 📦 Data Handling

- Orders stored in IndexedDB
- Presets stored in IndexedDB
- UI preferences stored in localStorage

---

## 📤 Export & Utilities

- **Excel Export:** SheetJS (xlsx)
- **CSV Export:** Native JS
- **PDF Handling:** FileReader API (Base64 conversion)

---

## 🌐 Additional Features

- Hash-based routing for tracking page (`#/track/ORDER_ID`)
- Dark Mode (persisted)
- Keyboard shortcuts
- Mobile responsive design

---

## ✅ Summary

This stack ensures:
- ⚡ High performance
- 📡 Offline-first capability
- 🤖 AI-powered automation
- 🔄 Scalable architecture
