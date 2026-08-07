# AI-Generated Alt Text Implementation Guide

## Overview

This system generates accessibility-compliant alt text for recipe images in both German and English using local Ollama vision models. Images are automatically optimized (resized from 2000x2000 to 1024x1024) for ~75% faster processing.

There is a second, separate pipeline for **hike photos** — same model, same
bilingual one-call prompt, but run offline as a script because hike images live
in the repo rather than in Mongo. See [Hike photos](#hike-photos) below.

## Architecture

```
┌─────────────────┐
│   Edit Page     │ ──┐
│  (Manual Btn)   │   │
└─────────────────┘   │
                      ├──> API Endpoints ──> Alt Text Service ──> Ollama (local)
┌─────────────────┐   │         ↓                    ↓
│   Admin Page    │   │    Update DB          Resize Images
│  (Bulk Process) │ ──┘
└─────────────────┘
```

## Files Created

### Core Services
- `src/lib/server/ai/ollama.ts` - Ollama API wrapper
- `src/lib/server/ai/alttext.ts` - Alt text generation logic (DE/EN)
- `src/lib/server/ai/imageUtils.ts` - Image optimization (resize to 1024x1024)

### API Endpoints
- `src/routes/api/generate-alt-text/+server.ts` - Single image generation
- `src/routes/api/generate-alt-text-bulk/+server.ts` - Batch processing

### UI Components
- `src/lib/components/GenerateAltTextButton.svelte` - Reusable button component
- `src/routes/admin/alt-text-generator/+page.svelte` - Bulk processing admin page

## Setup Instructions

### 1. Environment Variables

Add to your `.env` file:

```bash
OLLAMA_URL="http://localhost:11434"
```

### 2. Install/Verify Dependencies

```bash
# Sharp is already installed (for image resizing)
pnpm list sharp

# Verify Ollama is running
ollama list
```

### 3. Ensure Vision Model is Available

You have `gemma3:latest` installed. If not:

```bash
ollama pull gemma3:latest
```

## Usage

### Option 1: Manual Generation (Edit Page)

Add the button component to your edit page where images are managed:

```svelte
<script>
  import GenerateAltTextButton from '$lib/components/GenerateAltTextButton.svelte';

  // In your image editing section:
  let shortName = data.recipe.short_name;
  let imageIndex = 0; // Index of the image in the images array
</script>

<!-- Add this near your image upload/edit section -->
<GenerateAltTextButton {shortName} {imageIndex} />
```

### Option 2: Bulk Processing (Admin Page)

Navigate to: **`/admin/alt-text-generator`**

Features:
- View statistics (total images, missing alt text)
- Check Ollama status
- Process in batches (configurable size)
- Filter: "Only Missing" or "All (Regenerate)"

### Option 3: Programmatic API

```typescript
// POST /api/generate-alt-text
const response = await fetch('/api/generate-alt-text', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    shortName: 'brot',
    imageIndex: 0,
    modelName: 'gemma3:latest' // optional
  })
});

const { altText } = await response.json();
// altText = { de: "...", en: "..." }
```

## How It Works

### Image Processing Flow

1. **Input**: 2000x2000px WebP image (~4-6MB)
2. **Optimization**: Resized to 1024x1024px JPEG 85% quality (~1-2MB)
   - Maintains aspect ratio
   - Reduces processing time by ~75-85%
3. **Encoding**: Converted to base64
4. **AI Processing**: Sent to Ollama with context
5. **Output**: Alt text generated in both languages

### Alt Text Generation

**German Prompt:**
```
Erstelle einen prägnanten Alt-Text (maximal 125 Zeichen) für dieses Rezeptbild.
Rezept: Brot
Kategorie: Brot
Stichwörter: Sauerteig, Roggen

Beschreibe NUR das SICHTBARE: Aussehen, Farben, Präsentation, Textur.
```

**English Prompt:**
```
Generate a concise alt text (maximum 125 characters) for this recipe image.
Recipe: Bread
Category: Bread
Keywords: Sourdough, Rye

Describe ONLY what's VISIBLE: appearance, colors, presentation, texture.
```

### Database Updates

Updates are saved to:
- `recipe.images[index].alt` - German alt text
- `recipe.translations.en.images[index].alt` - English alt text

Arrays are automatically synchronized to match indices.

## Performance

### Image Optimization Impact

| Metric | Original (2000x2000) | Optimized (1024x1024) | Improvement |
|--------|---------------------|----------------------|-------------|
| File Size | ~12-16MB base64 | ~1-2MB base64 | 75-85% smaller |
| Processing Time | ~4-6 seconds | ~1-2 seconds | 75-85% faster |
| Memory Usage | High | Low | Significant |

### Batch Processing

- Processes images sequentially to avoid overwhelming CPU
- Configurable batch size (default: 10 recipes at a time)
- Progress tracking with success/fail counts

## Automatic Resizing

**Question**: Does Ollama resize images automatically?

**Answer**: Yes, but manual preprocessing is better:
- **Ollama automatic**: Resizes to 224x224 internally
- **Manual preprocessing**: Resize to 1024x1024 before sending
  - Reduces network overhead
  - Lowers memory usage
  - Faster inference
  - Better quality (more pixels than 224x224)

Sources:
- [Ollama Vision Models Blog](https://ollama.com/blog/vision-models)
- [Optimize Image Resolution for Ollama](https://markaicode.com/optimize-image-resolution-ollama-vision-models/)
- [Llama 3.2 Vision](https://ollama.com/library/llama3.2-vision)

## Integration with Image Upload

To auto-generate alt text when images change, add to your image upload handler:

```typescript
// After successful image upload:
if (newImageUploaded) {
  await fetch('/api/generate-alt-text', {
    method: 'POST',
    body: JSON.stringify({
      shortName: recipe.short_name,
      imageIndex: recipe.images.length - 1 // Last image
    })
  });
}
```

## Troubleshooting

### Ollama Not Available

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama
ollama serve

# Verify model is installed
ollama list | grep gemma3
```

### Alt Text Quality Issues

1. **Too generic**: Add more context (tags, ingredients)
2. **Too long**: Adjust max_tokens in `alttext.ts`
3. **Wrong language**: Check prompts in `buildPrompt()` function
4. **Low accuracy**: Consider using larger model (90B version)

### Performance Issues

1. **Slow processing**: Already optimized to 1024x1024
2. **High CPU**: Reduce batch size in admin page
3. **Memory errors**: Lower `maxWidth`/`maxHeight` in `imageUtils.ts`

## Future Enhancements

- [ ] Queue system for background processing
- [ ] Progress websocket for real-time updates
- [ ] A/B testing different prompts
- [ ] Fine-tune model on recipe images
- [ ] Support for multiple images per recipe
- [ ] Auto-generate on upload hook
- [ ] Translation validation (check DE/EN consistency)

## API Reference

### POST /api/generate-alt-text

Generate alt text for a single image.

**Request:**
```json
{
  "shortName": "brot",
  "imageIndex": 0,
  "modelName": "llava-llama3:8b"
}
```

**Response:**
```json
{
  "success": true,
  "altText": {
    "de": "Knuspriges Sauerteigbrot mit goldbrauner Kruste",
    "en": "Crusty sourdough bread with golden-brown crust"
  },
  "message": "Alt text generated and saved successfully"
}
```

### POST /api/generate-alt-text-bulk

Batch process multiple recipes.

**Request:**
```json
{
  "filter": "missing",  // "missing" or "all"
  "limit": 10,
  "modelName": "llava-llama3:8b"
}
```

**Response:**
```json
{
  "success": true,
  "processed": 25,
  "failed": 2,
  "results": [
    {
      "shortName": "brot",
      "name": "Sauerteigbrot",
      "processed": 1,
      "failed": 0
    }
  ]
}
```

### GET /api/generate-alt-text-bulk

Get statistics about images.

**Response:**
```json
{
  "totalWithImages": 150,
  "missingAltText": 42,
  "ollamaAvailable": true
}
```

## Testing

```bash
# Test Ollama connection
curl http://localhost:11434/api/tags

# Test image generation (replace with actual values)
curl -X POST http://localhost:5173/api/generate-alt-text \
  -H "Content-Type: application/json" \
  -d '{"shortName":"brot","imageIndex":0}'

# Check bulk stats
curl http://localhost:5173/api/generate-alt-text-bulk
```

## Hike photos

Hike images are files in the repo (`src/content/hikes/<slug>/images/`), not
database rows, so their descriptions are generated **offline and committed**
rather than produced on demand from an admin page.

### Running it

```bash
pnpm hikes:alt                                   # all hikes, only missing/stale
pnpm hikes:alt -- --slug=2025-klausenpasswanderung
pnpm hikes:alt -- --slug=a,b --limit=5 --dry-run # try the prompt, write nothing
pnpm hikes:alt -- --force                        # regenerate everything
pnpm hikes:alt -- --model=gemma3:latest
```

Then re-run the hike build so the manifest picks the text up:

```bash
pnpm exec vite-node scripts/build-hikes.ts
```

Roughly 1.5–5 s per image on a GPU-backed Ollama; the file is written after
every image, so an interrupted run resumes where it stopped.

### Storage: `src/content/hikes/<slug>/alt-text.json`

```json
{
  "PXL_20250807_092153821.jpg": {
    "hash": "3f9c1a20",
    "de": "Blick auf Zürich mit Stadtvierteln, Wäldern und See unter bewölktem Himmel.",
    "en": "View of Zurich's neighborhoods, forests and lake under a cloudy sky.",
    "model": "qwen3.5:9b",
    "generatedAt": "2026-08-07"
  }
}
```

- Keyed by **source filename**, so the file is readable and hand-editable.
- `hash` is the image's content hash (the same one the build and the GPX
  waypoints use). A re-run regenerates anything whose bytes changed, and
  `build-hikes` refuses to publish a description whose hash no longer matches —
  an edited photo under an unchanged filename can't silently ship the old text.
- `"locked": true` on an entry pins hand-written text. The generator never
  touches it, not even with `--force`.
- Only the **German** line is published (the hike pages are German-only). The
  English line is stored so a translated route later doesn't need a second
  inference run over every photo.

The photos themselves are *not* in git (`.gitignore` excludes
`src/content/hikes/*/images/`; they sync via `pnpm photos:push` / `photos:pull`),
but `alt-text.json` is — so the descriptions are versioned and reviewable even
though their images aren't. `scripts/hike-photos.sh` excludes it from the rsync
filter, so a `--delete` sync can't take it with them.

### What gets described

Only images the build actually publishes: `track.gpx` waypoint photos, images
referenced inline with `<HikeImage src="…">`, and `cover.*`. Everything else in
`images/` is dropped by `build-hikes`, so describing it would be wasted
inference — roughly half the files in a typical hike folder.

### Alt precedence in `build-hikes`

| Image | Order |
|---|---|
| Cover / hero | frontmatter `heroAlt` → generated → hike `title` |
| Route & prose photos | generated → `heroAlt` (first image only) → `Bild N` |

The author's own `heroAlt` always outranks the model. `ImagePoint.alt` (map
popup + photo strip + lightbox) gets the same resolved string as the `<img>`.

### The prompt

Built per image in `buildPrompt()`. Beyond the photo it passes:

- **Hike-level**: title, summary, month, SAC difficulty grade, tags, and the
  municipality/canton that `build-hikes` already reverse-geocoded (read from
  `scripts/.cache/hikes-geocode.json` — the generator makes no network calls of
  its own besides Ollama).
- **Shot-level**: altitude, elapsed time since the hike start, and distance
  along the route, taken from the image's GPX waypoint. Deliberately *not* the
  absolute capture time — `build-hikes` anonymises wall-clock times, and alt
  text shouldn't leak them back.

The context is framed as grounding, not content: the model is told never to name
a peak, hut, lake or village, and never to assert an altitude or distance, since
none of that is visible. The exceptions are a name legible on a signpost and the
broad region for a wide panorama. Handed a place name, a vision model will
otherwise cheerfully claim it saw that place, and alt text naming the wrong
mountain is worse than alt text naming none.

Other hiking-specific bits: lead with the main subject; describe terrain, trail,
rock, snow, water, vegetation, animals, buildings, sky and light; refer to people
generically ("zwei Wanderer"), never identifying them; no "Foto von …" lead-in
(stripped in post too, since models slip back into it); one sentence, ≤ 14 words.
Two other rules earn their place — "describe only what IS there" (a list of
categories otherwise invites "no trail visible" style negations) and "do not
repeat the region" (it otherwise appears in nearly every description of a hike).

The answer is parsed out of a `DE: … / EN: …` pair. When the model drops the
labels but still returns the two lines in order — which accounted for every one
of the 24 parse failures in the first 400-image run — a positional fallback
recovers them, guarded by a German/English score so a swapped pair is rejected
rather than stored backwards.

Length is capped twice: the prompt asks for ≤ 110 characters, and
`cleanAltText` hard-caps at 125 (roughly where JAWS truncates), cutting on a word
boundary. When the cap does bite, the script asks once more for a shorter answer
against the already-encoded image — cheap, since the vision tower dominates the
first call — and keeps that only if it comes back inside the limit.

## License & Credits

- Uses [Ollama](https://ollama.com/) for local AI inference
- Image processing via [Sharp](https://sharp.pixelplumbing.com/)
- Vision model: Gemma3 (better German language support)
