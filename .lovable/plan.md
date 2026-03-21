

# Enable Image Uploads in Rolly Chat

## Summary
Replace the receipt-only camera button with a general image upload. Users can attach screenshots (or any image) to their message, and Rolly will understand the content contextually — extracting tasks from a screenshot, reading a receipt, interpreting a flyer, etc. No separate receipt scanner needed; Rolly handles it all through its existing tool-calling (e.g. `create_task`, `create_expense`).

## What Changes

### 1. `src/hooks/useRollyChat.ts` — Multimodal message support
- Extend `RollyMessage` type so `content` can be `string | Array<{type: string; text?: string; image_url?: {url: string}}>}`
- Add optional `imageData` param to `send()`: `{ base64: string; mimeType: string }`
- When image is provided, construct a multimodal content array:
  ```
  [
    { type: "image_url", image_url: { url: "data:image/jpeg;base64,..." } },
    { type: "text", text: "user's message or 'What's in this image?'" }
  ]
  ```
- Display message uses the text portion only (image shown separately in bubble)

### 2. `src/components/rolly/RollyChat.tsx` — Image picker replaces receipt scanner
- Remove `ReceiptScanner` import and all receipt-specific logic (the `onConfirm` handler, artists query for receipts)
- Camera button opens a hidden `<input type="file" accept="image/*" capture="environment">` 
- When image selected: compress/resize to max 1MB, store as base64 in state, show thumbnail preview above textarea with X to remove
- On send: pass `imageData` to `send()` alongside typed text
- If no text typed, default to: "What's in this image?"

### 3. `src/components/rolly/RollyMessage.tsx` — Render images in bubbles
- Detect when `message.content` is an array (multimodal)
- For user messages with images: render a small thumbnail above the text content
- Assistant messages remain text-only (markdown)

### 4. `supabase/functions/rolly-chat/index.ts` — No changes needed
- The gateway already passes multimodal content arrays through to Gemini 3 Flash, which natively supports vision
- Rolly's existing tools (`create_task`, `create_expense`, etc.) let it act on what it sees — no new tools required
- Add a line to the system prompt: "When the user sends an image, analyze it contextually. If it contains tasks or action items, offer to create them. If it's a receipt, offer to log the expense. Otherwise, describe what you see and ask how you can help."

## Files

| File | Change |
|------|--------|
| `src/hooks/useRollyChat.ts` | Multimodal content type + `imageData` in `send()` |
| `src/components/rolly/RollyChat.tsx` | Image picker, preview, remove ReceiptScanner |
| `src/components/rolly/RollyMessage.tsx` | Render image thumbnails in user bubbles |
| `supabase/functions/rolly-chat/index.ts` | Add image-awareness hint to system prompt |

