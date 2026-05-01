# Claude + Gemini Integration Setup

## Overview
Your Sales Tracker now uses **Claude as the primary API** with **Gemini as automatic fallback**.

**Flow:**
```
Request → Try Claude (Primary) 
        ↓
      Busy? → Try next Claude key/model
        ↓
    All Claude exhausted? → Try Gemini (Fallback)
        ↓
      Busy? → Try next Gemini key/model
        ↓
    All exhausted? → Return error
```

## Quick Setup

### 1. Get Claude API Key
1. Go to: https://console.anthropic.com/account/keys
2. Create new API key (choose a meaningful name like "sales-tracker")
3. Copy the key (starts with `sk-ant-`)

### 2. Update `.env.local`
```env
# Primary (Claude)
CLAUDE_API_KEYS=sk-ant-xxxxxxxxxxxxx

# Fallback (Gemini - already configured)
GEMINI_API_KEYS=AIzaSyBOMh2PUc9V9TSL9-QfjHsXjXCBqG-bYiA
```

### 3. Test
Run your app and upload a label/PDF. It will use Claude by default.

---

## Multiple Claude Keys (Recommended for Production)

### Why Multiple Keys?
- Each API key has **separate rate limits**
- If one key hits the limit, system tries the next
- Better reliability under heavy load
- **No additional cost** (same pricing)

### Setup
1. Create multiple API keys in Claude console
2. Update `.env.local`:
```env
# Multiple keys = automatic fallback
CLAUDE_API_KEYS=sk-ant-key1,sk-ant-key2,sk-ant-key3
CLAUDE_MODELS=claude-3-5-sonnet-20241022
```

---

## Claude vs Gemini Comparison

| Feature | Claude | Gemini |
|---------|--------|--------|
| **Best for** | Label extraction | Budget fallback |
| **Accuracy** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Speed** | Fast | Very fast |
| **Rate Limits** | Higher (2M tokens/min) | Lower (60 req/min free) |
| **Cost** | ~$0.003 per request | ~$0.01 per request |
| **Free Tier** | ✅ $5/month | ✅ Limited |

---

## Cloud Deployment (Vercel)

### 1. Go to Vercel Dashboard
https://vercel.com/dashboard → Your Project

### 2. Add Environment Variables
**Settings → Environment Variables**

| Variable | Value | Scope |
|----------|-------|-------|
| `CLAUDE_API_KEYS` | `sk-ant-xxxxx` | Production, Preview, Development |
| `CLAUDE_MODELS` | `claude-3-5-sonnet-20241022` | All |
| `GEMINI_API_KEYS` | Your Gemini key | All |
| `GEMINI_MODELS` | `gemini-3.1-flash-lite-preview,gemini-2.0-flash` | All |

### 3. Redeploy
**Deployments → Redeploy latest**

---

## Logs & Debugging

### Check if Claude is Being Used
Look for these in server logs:
```
Attempting Claude API (primary)...
Trying Claude: claude-3-5-sonnet-20241022 (key: sk-ant-xxx...)
Claude API succeeded ✅
```

### If Claude Fails & Falls Back
```
Claude busy (429): Rate limit exceeded
Falling back to Gemini...
Trying Gemini: gemini-3.1-flash-lite-preview
Gemini API succeeded ✅
```

### Both Failed
```
All Claude and Gemini combinations exhausted
```

---

## Pricing (as of 2024)

### Claude 3.5 Sonnet (Recommended)
- Input: **$3 per 1M tokens**
- Output: **$15 per 1M tokens**
- Typical label: ~500 input + 200 output tokens = **~$0.003**

### Gemini (Budget Alternative)
- Input: **$0.075 per 1M tokens**
- Output: **$0.30 per 1M tokens**
- Typical label: ~500 input + 200 output tokens = **~$0.001**

### Monthly Estimate (1000 labels/month)
- **Claude**: ~$3
- **Gemini**: ~$1
- **Both with fallback**: ~$3 (rarely uses Gemini)

---

## Troubleshooting

### Claude Key Not Working
```
Error: 401 Unauthorized
```
**Fix:** 
1. Check key is correct (starts with `sk-ant-`)
2. Verify it's not expired: https://console.anthropic.com/account/keys
3. Regenerate key if needed

### Still Getting 503 Errors
```
Both Claude and Gemini are currently unavailable
```
**Solutions:**
1. Add more Claude keys (different projects)
2. Add more Gemini keys
3. Wait a few minutes for rate limits to reset

### Wrong Model Name
```
Error: 404 Model not found
```
**Fix:** Use one of these valid models:
- `claude-3-5-sonnet-20241022` ✅ (recommended)
- `claude-3-opus-20240229`
- `claude-3-haiku-20240307`

---

## Advanced: Custom Configuration

### Priority by Project
```env
# Development: Use cheaper Gemini
CLAUDE_API_KEYS=
GEMINI_API_KEYS=your_key

# Production: Use reliable Claude + Gemini backup
CLAUDE_API_KEYS=sk-ant-prod-key1,sk-ant-prod-key2
GEMINI_API_KEYS=your_key
```

### Different Teams
```env
# Team A's keys
CLAUDE_API_KEYS=sk-ant-team-a-key
GEMINI_API_KEYS=gemini-key-a

# (restart app to switch)
```

---

## Support

- **Claude Help**: https://support.anthropic.com
- **Gemini Help**: https://ai.google.dev/
- **Rate Limit Status**: Check console logs for `429` errors

---

## Next Steps

1. ✅ Add Claude key to `.env.local`
2. ✅ Test locally
3. ✅ Deploy to Vercel with env variables
4. ✅ Monitor logs in Vercel dashboard
5. ✅ (Optional) Add more keys for better reliability
