# Gemini API Fallback Configuration

## Overview
The Sales Tracker now supports multiple Gemini API keys and models. If one API key/model is experiencing high demand (503/429 errors), the system automatically tries other combinations until one succeeds.

## How It Works

### Smart Fallback Logic
1. **Creates combinations** of all API keys × all models
2. **Tries each combination** in order (all models for key1, then all models for key2, etc.)
3. **On 503/429 errors** (busy): Moves to next combination
4. **On auth errors** (401/403/404): Fails immediately (configuration error)
5. **On success**: Returns response immediately
6. **All exhausted**: Returns helpful error message

### Response Time Benefits
- Waits only 500ms-1sec between retry attempts (reduced from 1-2sec)
- Switches to different keys/models instead of retrying the same one
- Exponential backoff: first retry ~500ms, second retry ~1sec

## Configuration

### `.env.local` Settings

```env
# Multiple API keys (comma-separated, no spaces)
GEMINI_API_KEYS=key1,key2,key3

# Multiple models (comma-separated, no spaces)  
GEMINI_MODELS=gemini-3.1-flash-lite-preview,gemini-2.0-flash
```

### To Add More API Keys:

1. Get additional API keys from: https://aistudio.google.com/app/apikey
   - Create a new Google Cloud project if needed
   - Enable the Generative Language API
   - Create API keys for that project

2. Update `.env.local`:
   ```env
   GEMINI_API_KEYS=your_key_1,your_key_2,your_key_3
   ```

### To Add More Models:

1. Check available models: `GET http://localhost:3000/api/list-models`

2. Add them to `.env.local`:
   ```env
   GEMINI_MODELS=gemini-3.1-flash-lite-preview,gemini-2.0-flash,gemini-1.5-flash
   ```

## Error Handling

### Normal Success
- Returns parsed label data immediately

### High Demand (503/429)
- Tries next API key/model combination
- Shows in logs: `Gemini API error (model_name, key: xxxxxxxx..., status 503)`

### Configuration Error (401/403/404)
- Fails immediately with helpful error
- Check API key validity and model name spelling

### All Combinations Exhausted
- Returns 503 with message: "All API keys and models are currently unavailable..."
- Shows `totalCombinations: X` in response for debugging

## Logs

Check server logs (terminal) for:
- ✅ **Success**: Response returned with parsed data
- ⚠️  **Retry**: `Gemini API error (model_name, key: xxx..., status XXX)`
- ❌ **All Failed**: `All Gemini API combinations exhausted`

## Tips

1. **Different Projects**: Use API keys from different Google Cloud projects for maximum quota separation
2. **Monitor Usage**: Check Google AI Studio dashboard regularly (aistudio.google.com)
3. **Rate Limiting**: Consider using different keys for different user groups
4. **Cost Control**: Each project has separate billing and quota limits

## Backward Compatibility

If you only have one API key:
```env
GEMINI_API_KEYS=your_single_key
GEMINI_MODELS=gemini-3.1-flash-lite-preview
```

The system works identically to before, just with added multi-model fallback.
