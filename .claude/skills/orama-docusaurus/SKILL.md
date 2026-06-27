---
name: orama-docusaurus
description: "Use when working with @orama/plugin-docusaurus-v3 — installing, configuring, theming, or debugging the Orama search plugin in a Docusaurus 3.x site. Covers the Shadow DOM theming constraint, CSS custom properties, plugin config options, dark mode, all search modes (fulltext/vector/hybrid), filters, facets, geosearch, results pinning, fields boosting, typo tolerance, exact match, BM25 tuning, the Answer Engine, the plugin system, and the Orama Cloud upgrade path."
---

# @orama/plugin-docusaurus-v3 — Integration Skill

Sources: [types.ts](https://raw.githubusercontent.com/oramasearch/orama/main/packages/orama/src/types.ts), [search-hybrid.ts](https://raw.githubusercontent.com/oramasearch/orama/main/packages/orama/src/methods/search-hybrid.ts), [hybrid tests](https://raw.githubusercontent.com/oramasearch/orama/main/packages/orama/tests/search.hybrid.test.ts), [answerSession.ts](https://raw.githubusercontent.com/oramasearch/oramacloud-client-javascript/main/packages/client/src/answerSession.ts), [filters tests](https://github.com/askorama/orama/blob/main/packages/orama/src/types.ts), [geosearch docs](https://docs.orama.com/open-source/usage/search/geosearch), [pinning source](https://github.com/oramasearch/orama/blob/main/packages/orama/src/methods/pinning.ts), [facets.ts](https://raw.githubusercontent.com/oramasearch/orama/refs/heads/main/packages/orama/src/components/facets.ts), [fields-boosting.mdx](https://raw.githubusercontent.com/oramasearch/docs/main/content/docs/orama-js/search/fields-boosting.mdx), [search index.mdx](https://raw.githubusercontent.com/oramasearch/docs/refs/heads/main/content/docs/orama-js/search/index.mdx), [BM25 reference](https://mintlify.wiki/oramasearch/orama/advanced/bm25), [plugin-docusaurus-v3 types](https://raw.githubusercontent.com/oramasearch/orama/main/packages/plugin-docusaurus-v3/src/types.ts)

---

## 1. Overview

`@orama/plugin-docusaurus-v3` adds full-text, vector, and hybrid search to a Docusaurus 3.x site. In OSS (local) mode it builds a gzipped Orama index at build time and serves it client-side — no API key required. In Cloud mode it pushes content to Orama Cloud and optionally enables an AI Answer Engine.

**Package name:** `@orama/plugin-docusaurus-v3`
Do NOT use `@orama/plugin-docusaurus` — that is the Docusaurus v2 package.

**Current version:** 3.2.0 | **License:** Apache-2.0

### CRITICAL CONSTRAINT: Shadow DOM

Orama's UI components (`OramaSearchBox`, `OramaSearchButton`) are **StencilJS Web Components with Shadow DOM enabled**. This has one irreversible consequence for styling:

> **External CSS selectors cannot pierce the Shadow DOM boundary.** Adding `.orama-*`, `[id^=orama-ui]`, or any other selector to `custom.css` will build successfully but produce ZERO visual effect at runtime.

The build does not warn you. Visual changes fail silently.

**What DOES work:** CSS custom properties (CSS variables) are inherited through Shadow DOM boundaries. Orama components consume design tokens as CSS variables set on their host element `[id^="orama-ui"]`.

**Only two theming mechanisms work:**
1. The `themeConfig` prop on `OramaSearchBox` — passed via `searchbox.themeConfig` in `docusaurus.config.js` (recommended)
2. Setting CSS custom properties directly on `[id^="orama-ui"]` in your stylesheet

---

## 2. Installation

```bash
npm install @orama/plugin-docusaurus-v3
```

**Peer dependencies (required):**
- `@docusaurus/plugin-content-docs ^3`
- `@docusaurus/theme-common ^3`
- `@docusaurus/utils ^3`

**Known peer dep conflict:** Plugin v3.1.x pins `@docusaurus/plugin-content-docs ~3.6.0`. For Docusaurus 3.7.0+:

```bash
npm install @orama/plugin-docusaurus-v3 --legacy-peer-deps
```

This is fixed in v3.2.0+.

### Minimal config (OSS mode — no API key needed)

```js
// docusaurus.config.js
export default {
  plugins: ['@orama/plugin-docusaurus-v3'],
};
```

### Cloud mode config

```js
export default {
  plugins: [
    [
      '@orama/plugin-docusaurus-v3',
      {
        cloud: {
          apiKey: 'YOUR_PUBLIC_API_KEY',
          collectionId: 'YOUR_COLLECTION_ID',  // OramaCore (preferred)
          deploy: 'default',
        },
      },
    ],
  ],
};
```

---

## 3. Plugin Config Options

```typescript
type PluginOptions = {
  plugins?: {
    analytics?: {
      enabled: boolean;
      apiKey: string;
      indexId: string;        // OSS mode only; ignored in Cloud
    };
  };
  cloud?: {
    apiKey: string;           // required — Public API key
    indexId?: string;         // legacy Orama Cloud
    collectionId?: string;    // OramaCore (preferred)
    deploy?: 'default' | 'snapshot-only';
  };
  searchbox?: Record<string, any>;      // OramaSearchBox props
  searchButton?: Record<string, any>;   // OramaSearchButton props
};
```

### Full options example

```js
export default {
  plugins: [
    [
      '@orama/plugin-docusaurus-v3',
      {
        cloud: {
          apiKey: 'YOUR_API_KEY',
          collectionId: 'YOUR_COLLECTION_ID',
          deploy: 'default',              // 'default' | 'snapshot-only'
        },
        plugins: {
          analytics: {
            enabled: true,
            apiKey: 'YOUR_ANALYTICS_API_KEY',
            indexId: 'YOUR_INDEX_ID',     // OSS only
          },
        },
        searchbox: {
          searchPlaceholder: 'Search docs...',
          chatPlaceholder: 'Ask anything...',
          suggestions: ['Getting started', 'API reference'],
          layout: 'modal',                // 'modal' (default) | 'embed'
          linksTarget: '_self',
          showKeyboardShortcuts: true,
          searchParams: {
            limit: 20,
            tolerance: 1,
            threshold: 0.5,
            boost: { title: 2, section: 1.5, content: 1 },
          },
          themeConfig: {
            typography: { '--font-primary': '"Inter", sans-serif' },
            colors: {
              light: { '--background-color-primary': '#ffffff' },
              dark:  { '--background-color-primary': '#0d1117' },
            },
          },
        },
        searchButton: {
          text: 'Search',
        },
      },
    ],
  ],
};
```

### Cloud config validation rules

- Either `indexId` or `collectionId` must be present alongside `apiKey`
- `deploy`, if provided, must be `'default'` or `'snapshot-only'`
- Violating any rule throws: `'Orama: Invalid cloud configuration.'`

### Operating modes

**OSS (local) mode** — no `cloud` key:
- Build time: indexes all docs/blog/pages into a gzipped file (`orama-search-index-current.json.gz`)
- Runtime: browser fetches and decompresses the gzip; all search runs client-side
- AI chat: disabled (`disableChat` hardcoded to `true`)
- Vector/hybrid search: not supported

**Cloud mode** — `cloud` key present:
- Pushes content to Orama Cloud edge; search runs at cloud endpoints
- AI Answer Engine available (production endpoint only, not staging)
- Vector/hybrid search supported

### `cloud.deploy` behavior

| Value | Effect |
|---|---|
| `'default'` | Syncs index AND triggers a live deployment |
| `'snapshot-only'` | Syncs index but does NOT deploy (search results unchanged) |
| omitted | Indexes docs but does not sync the live index |

### Indexed content schema (OSS mode)

```typescript
{
  title:    'string',
  content:  'string',
  path:     'string',
  section:  'string',
  category: 'enum',   // 'docs' | 'blogs' | 'pages'
  version:  'enum',   // 'current' | frozen version label
}
```

Each h1–h6 heading section becomes a separate indexed record.

---

## 4. Theming / CSS Custom Properties

### Why Shadow DOM matters

```css
/* custom.css — has NO EFFECT inside Shadow DOM */
.orama-search-box { background: red; }
[id^=orama-ui] button { color: blue; }
[id^=orama-ui] input { font-size: 16px; }
```

```css
/* custom.css — CSS vars PIERCE Shadow DOM — this works */
[id^="orama-ui"] {
  --background-color-primary: #ffffff;
  --text-color-primary: #111111;
}
```

### CSS variable naming

There is exactly **one** `--orama-*` prefixed variable:

```
--orama-base-font-size   (default: 16, divisor for all pxToRem size calculations)
```

**All other CSS variables have NO `--orama-` prefix.** The naming pattern is:

```
--{feature}-color-{role}
```

Examples: `--text-color-primary`, `--background-color-accent`, `--button-background-color-primary`

### Method 1: `themeConfig` in `docusaurus.config.js` (recommended)

Supports independent light and dark overrides. Applied as inline styles — highest specificity.

```js
searchbox: {
  themeConfig: {
    colors: {
      light: {
        '--background-color-primary':        '#ffffff',
        '--background-color-secondary':      '#f8f8f8',
        '--background-color-accent':         '#1a73e8',
        '--button-background-color-primary': '#1a73e8',
        '--text-color-primary':              '#111111',
        '--text-color-secondary':            '#555555',
        '--border-color-accent':             '#1a73e8',
      },
      dark: {
        '--background-color-primary':        '#0d1117',
        '--background-color-secondary':      '#161b22',
        '--background-color-accent':         '#4285f4',
        '--button-background-color-primary': '#4285f4',
        '--text-color-primary':              '#e6edf3',
        '--text-color-secondary':            '#8b949e',
      },
    },
    typography: {
      '--font-primary': '"Inter", sans-serif',
    },
    radius: {
      '--radius-xs':       '4px',
      '--radius-s':        '6px',
      '--radius-m':        '8px',
      '--radius-l':        '12px',
      '--radius-3xl':      '20px',
      '--textarea-radius': '12px',
    },
    shadow: {
      '--textarea-shadow': '0px 2px 12px 0px rgba(0,0,0,0.1)',
    },
  },
}
```

Primitive palette token override (remaps the entire design token layer):

```js
themeConfig: {
  colors: {
    purple700: '#1a73e8',  // deep-purple accent in light mode
    purple500: '#4285f4',  // medium-purple accent in dark mode
  },
}
```

### Method 2: CSS custom properties in `custom.css`

```css
/* website/src/css/custom.css */

[id^="orama-ui"] {
  --background-color-primary:        #ffffff;
  --background-color-accent:         #1a73e8;
  --button-background-color-primary: #1a73e8;
  --text-color-primary:              #111111;
  --border-color-accent:             #1a73e8;
  --font-primary:                    "Inter", sans-serif;
  --radius-m:                        6px;
  --radius-l:                        8px;
  /* --orama-base-font-size: 18; */  /* scale all sizes proportionally */
}

[id^="orama-ui"].theme-dark {
  --background-color-primary:        #0d1117;
  --background-color-secondary:      #161b22;
  --background-color-accent:         #4285f4;
  --button-background-color-primary: #4285f4;
  --text-color-primary:              #e6edf3;
}
```

### Dark mode

Docusaurus uses `html[data-theme="dark"]`; Orama uses `.theme-dark` on the host element. The plugin bridges them automatically via `colorScheme` prop. No configuration needed.

```css
/* CORRECT */
[id^="orama-ui"].theme-dark { --background-color-primary: #0d1117; }

/* WRONG — has no effect on Orama Shadow DOM internals */
[data-theme="dark"] [id^="orama-ui"] { --background-color-primary: #0d1117; }
```

### SearchButton styling

`OramaSearchButton` receives `className="DocSearch-Button"` so it inherits Docusaurus's DocSearch button slot. Additional overrides outside Shadow DOM that DO work:

```css
.DocSearch-Button { user-select: none; }
.DocSearch-Button kbd { border: 0; box-shadow: none; font-size: .8rem !important; padding: 0 !important; }
```

### Swizzling the SearchBar

```bash
npx docusaurus swizzle @orama/plugin-docusaurus-v3 SearchBar --eject
```

Source: `src/theme/SearchBar/index.tsx`

---

## 5. Search Features

All search features in this section operate via the `search()` function from `@orama/orama`. When using the Docusaurus plugin, pass search parameters via `searchbox.searchParams` in `docusaurus.config.js`. The plugin auto-adds `where: { version: { eq: versionName } }` to every query for version-aware search.

```typescript
// Function signature
search<T extends AnyOrama, ResultDocument = TypedDocument<T>>(
  orama: T,
  params: SearchParams<T, ResultDocument>,
  language?: string
): Results<ResultDocument> | Promise<Results<ResultDocument>>
```

### Return shape

```typescript
interface Results<Document> {
  count: number                  // total matching documents
  hits: Array<{
    id: string
    score: number
    document: Document
  }>
  elapsed: { raw: number; formatted: string }  // e.g. "3ms"
  facets?: FacetResult           // present when facets param provided
  groups?: GroupResult<Document> // present when groupBy param provided
}
```

---

### 5.1 Full-Text Search (BM25)

Full-text is the **default mode** — omit `mode` or set `mode: 'fulltext'`. Uses BM25+ probabilistic ranking. Open-source, no Cloud required.

```js
// docusaurus.config.js — searchParams under searchbox
searchbox: {
  searchParams: {
    limit: 20,
    tolerance: 1,
    threshold: 0,
    boost: { title: 2, section: 1.5 },
  },
}
```

```js
// Direct @orama/orama usage
const results = await search(db, {
  term: 'wireles headphnes',
  properties: ['title', 'description'],
  tolerance: 2,
  boost: { title: 2 },
  limit: 20,
  offset: 0,
  threshold: 0,
})
```

**Full-text search params:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `term` | `string` | — | Search query text |
| `mode` | `'fulltext'` | `'fulltext'` | Selects BM25 search |
| `properties` | `'*' \| string[]` | `'*'` | Fields to search against |
| `limit` | `number` | `10` | Max documents to return |
| `offset` | `number` | `0` | Pagination offset |
| `tolerance` | `number` | `0` | Max Levenshtein distance for typo matching |
| `exact` | `boolean` | `false` | Require exact whole-word match |
| `threshold` | `number` | `1` | Min BM25 relevance score (0–1) |
| `relevance` | `BM25Params` | `{k:1.2,b:0.75,d:0.5}` | BM25 tuning |
| `boost` | `Record<string,number>` | — | Per-field score multipliers |
| `where` | `WhereCondition` | — | Filter predicates |
| `facets` | `FacetsParams` | — | Facet aggregation |
| `sortBy` | `SortByParams` | — | Custom sort order |
| `distinctOn` | `string` | — | Deduplicate by field |
| `preflight` | `boolean` | `false` | Return count+facets only, no hits |
| `includeVectors` | `boolean` | `false` | Include vector embeddings in hits |

#### BM25 tuning (`relevance`)

Orama implements **BM25+** (not classic BM25). The `d` parameter prevents documents containing a query term from scoring zero.

```typescript
export type BM25Params = {
  k?: number   // default: 1.2  (term-frequency saturation; range 0–3)
  b?: number   // default: 0.75 (document-length normalization; range 0–1)
  d?: number   // default: 0.5  (delta/score floor; range 0–1)
}
```

**Formula:** `IDF * (d + tf * (k+1)) / (tf + k * (1 - b + b * fieldLen / avgFieldLen))`

```js
// Fine-tuning examples
await search(db, {
  term: 'machine learning',
  relevance: { k: 1.5, b: 0.9, d: 0.5 },
})
```

| Use case | Recommended settings |
|---|---|
| Short docs / titles | `b: 0` (no length penalty) |
| Long articles | `b: 0.85` (stronger length norm) |
| E-commerce | `k: 1.5, b: 0.5` |
| Code / technical | `k: 2.0, b: 0.3` |
| General (default) | `k: 1.2, b: 0.75, d: 0.5` |

#### Typo tolerance (`tolerance`)

`tolerance` (default `0`) is the maximum **Levenshtein edit distance** allowed. No named levels — use integers.

| Value | Behavior |
|---|---|
| `0` (default) | No typos — exact/prefix match only |
| `1` | Tolerates 1 edit (`"fx"` matches `"fox"`) |
| `2` | Tolerates 2 edits (`"seahrse"` matches `"seahorse"`) |

- Only available in `fulltext` and `hybrid` modes (not `vector`)
- Applies globally to all searched string fields — no per-field tolerance
- Prefix matches always cost 0 edits regardless of tolerance setting
- If `|len(term) - len(word)| > tolerance`, word is immediately rejected (early exit)

```js
const result = await search(db, { term: 'seahrse', tolerance: 2 })
```

#### Exact match (`exact`)

When `exact: true`, only documents where the search term appears as a complete whole word are returned. Uses word-boundary regex (`\b...\b`) as a post-index filter.

- Case-sensitive internally (regex has no `i` flag), even though normal search is case-insensitive
- Mutually exclusive with `tolerance` — `exact` takes priority when both are set
- Multi-word terms require ALL tokens to match as whole words

```js
// Matches "Chris" but NOT "Christopher"
const results = search(movieDB, {
  term: 'Chris',
  properties: ['director'],
  exact: true,
})
```

#### `threshold` explained

- `threshold: 0` — returns all documents containing the token, no score floor
- `threshold: 1` (default) — documents must have a meaningful BM25 score
- Intermediate values allow partial matching

#### `preflight` (result-count preview)

```js
const { count, facets } = await search(db, {
  term: 'bluetooth',
  preflight: true,
  facets: { category: { limit: 5 } },
})
// count is the total; hits is empty
```

---

### 5.2 Vector Search

Vector search uses cosine similarity on numeric embedding arrays. Requires **Orama Cloud mode** when used with the Docusaurus plugin (OSS mode does not generate embeddings). Open-source in `@orama/orama` directly.

```typescript
// Schema declaration — dimension must match your embedding model
const db = await create({
  schema: {
    title: 'string',
    embedding: 'vector[1536]',  // vector[N] where N = dimension count
  } as const,
})
```

```js
// docusaurus.config.js (Cloud mode required)
searchbox: {
  searchParams: {
    mode: 'vector',
    similarity: 0.8,
  },
}
```

```js
// Direct @orama/orama usage
const results = await search(db, {
  mode: 'vector',
  vector: {
    value: [0.1, 0.2, 0.3, 0.4, 0.5],
    property: 'embedding',
  },
  similarity: 0.8,
  limit: 10,
  includeVectors: false,
})
```

**Vector search params:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `mode` | `'vector'` | — | Required to activate vector search |
| `vector.value` | `number[] \| Float32Array` | — | Embedding to search with |
| `vector.property` | `string` | — | Schema field containing stored vectors; supports dot notation |
| `term` | `string` | — | Auto-converted to vector when auto-embed plugin is active |
| `similarity` | `number` | `0.8` | Min cosine similarity (0–1); set to `0` to bypass threshold |
| `limit` | `number` | `10` | Max documents to return |
| `offset` | `number` | `0` | Pagination offset |
| `includeVectors` | `boolean` | `false` | Include raw embedding arrays in hits; `false` → vectors appear as `null` |
| `where` | `WhereCondition` | — | Scalar filter applied before ranking |
| `facets` | `FacetsParams` | — | Facet aggregation |

Valid schema vector types: `vector[384]`, `vector[512]`, `vector[768]`, `vector[1024]`, `vector[1536]`, `vector[3072]`, etc. Dimension is fixed at creation time.

#### Auto-generating embeddings (open-source, offline)

```bash
npm i @orama/plugin-embeddings @tensorflow/tfjs-node
```

```js
import { pluginEmbeddings } from '@orama/plugin-embeddings'
import '@tensorflow/tfjs-node'

const plugin = await pluginEmbeddings({
  embeddings: {
    defaultProperty: 'embeddings',   // must be 'vector[512]' in schema
    onInsert: {
      generate: true,
      properties: ['description'],   // source fields to embed
      verbose: true,
    },
  },
})

// With plugin active, 'term' is auto-converted to vector
const results = await search(db, {
  term: 'Headphones for students',
  mode: 'vector',
})
```

#### Auto-generating embeddings (Secure Proxy — Cloud account required)

```bash
npm i @orama/plugin-secure-proxy
```

```js
import { pluginSecureProxy } from '@orama/plugin-secure-proxy'

const db = await create({
  schema: { title: 'string', embeddings: 'vector[384]' },
  plugins: [
    pluginSecureProxy({
      apiKey: 'xyz',
      embeddings: {
        defaultProperty: 'embeddings',
        model: 'orama/gte-small',     // 384-dim
        onInsert: { generate: true, properties: ['title'] },
      },
      chat: { model: 'openai/gpt-4o' },
    }),
  ],
})
```

**Available embedding models (Secure Proxy):**

| Model | Provider | Dimensions |
|---|---|---|
| `orama/gte-small` | Orama | 384 |
| `orama/gte-medium` | Orama | 768 |
| `orama/gte-large` | Orama | 1024 |
| `openai/text-embedding-ada-002` | OpenAI | 1536 |
| `openai/text-embedding-3-small` | OpenAI | 1536 |
| `openai/text-embedding-3-large` | OpenAI | 3072 |

---

### 5.3 Hybrid Search

Hybrid search combines **BM25 full-text** and **vector cosine similarity** into a single ranked list. Fully open-source in `@orama/orama`. Cloud adds auto-embedding via Secure Proxy.

**Scoring algorithm:**
1. Run BM25 full-text → scores
2. Run cosine similarity → scores
3. Min-max normalize each set independently to [0, 1]
4. Merge by document ID: `finalScore = normalize(textScore) * textWeight + normalize(vectorScore) * vectorWeight`
5. Sort descending

```js
const results = await search(db, {
  mode: 'hybrid',
  term: 'noise cancelling headphones',
  vector: {
    value: embeddingArray,
    property: 'embedding',
  },
  similarity: 0.8,
  hybridWeights: { text: 0.3, vector: 0.7 },
  threshold: 0,
  limit: 10,
})
```

**Hybrid search params:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `mode` | `'hybrid'` | — | Required to activate hybrid search |
| `term` | `string` | — | Required — full-text query for BM25 side |
| `vector.value` | `number[] \| Float32Array` | — | Embedding (or use auto-embed plugin with `term`) |
| `vector.property` | `string` | — | Schema field containing stored vectors |
| `similarity` | `number` | `0.8` | Min cosine similarity for vector side |
| `hybridWeights` | `{text:number; vector:number}` | `{text:0.5, vector:0.5}` | Relative weighting; weights need not sum to 1 |
| `tolerance` | `number` | `0` | Typo tolerance for full-text side only |
| `properties` | `'*' \| string[]` | `'*'` | Full-text search fields |
| `relevance` | `BM25Params` | `{k:1.2,b:0.75,d:0.5}` | BM25 tuning for full-text side |
| `boost` | `Record<string,number>` | — | Field score multipliers (full-text side) |
| `threshold` | `number` | `0` | Min hybrid score [0–1] to include a result |
| `limit` | `number` | `10` | Max results after merging |
| `offset` | `number` | `0` | Pagination offset |
| `where` | `WhereCondition` | — | Filter applied to merged results |
| `facets` | `FacetsParams` | — | Facet aggregation |
| `includeVectors` | `boolean` | `false` | Include raw embeddings in hits |

```js
// Text-only hybrid (ignore vector side)
await search(db, {
  mode: 'hybrid',
  term: 'hello world',
  vector: { value: [1, 2, 3], property: 'embedding' },
  hybridWeights: { text: 1, vector: 0 },
})
```

**When to use each mode:**

| Mode | Best for |
|---|---|
| `fulltext` | Keyword queries, exact terms, acronyms, SKUs |
| `vector` | Semantic/conceptual queries where exact words do not matter |
| `hybrid` | General search (handles both keyword precision and semantic recall) |

---

### 5.4 Filters (`where` clause)

The `where` parameter narrows results to documents matching filter conditions. Available in all three search modes. Open-source.

```typescript
where?: Partial<WhereCondition<T['schema']>>
```

Multiple top-level field keys are combined with **implicit AND**.

#### Number filters

```js
where: { rating: { gt: 4 } }
where: { rating: { gte: 3 } }
where: { rating: { lt: 5 } }
where: { rating: { lte: 3 } }
where: { rating: { eq: 3 } }
where: { rating: { between: [1, 4] } }  // inclusive range
```

**Only ONE operator per field.** Combining two (e.g. `gt + lte`) throws `INVALID_FILTER_OPERATION`.

#### String filters

```js
where: { tags: 'coffee' }              // exact match
where: { name: ['machine', 'maker'] }  // OR match (any value)
```

String filters respect tokenizer stemming.

#### Boolean filters

```js
where: { isAvailable: true }
```

#### Enum filters

```js
where: { categoryId: { eq: 1 } }
where: { categoryId: { in: [1, 3, '5'] } }
where: { categoryId: { nin: [1, 2] } }
```

#### Enum array (`enum[]`) filters

```js
where: { tags: { containsAll: ['green', 'blue'] } }  // must have ALL
where: { tags: { containsAny: ['green', 'blue'] } }  // must have at least ONE
```

`eq`, `in`, `nin` are NOT available on `enum[]` fields.

#### Logical operators

```js
// Explicit AND
where: {
  and: [
    { rating: { between: [1, 4] } },
    { price: { lte: 40 } },
  ],
}

// OR
where: {
  or: [
    { rating: { gt: 4 } },
    { price: { lt: 30 } },
  ],
}

// NOT
where: { not: { rating: { gt: 4 } } }

// Nested
where: {
  or: [
    { and: [{ rating: { gt: 4 } }, { price: { gt: 50 } }] },
    { and: [{ not: { rating: { gt: 4 } } }, { price: { lt: 30 } }] },
  ],
}
```

Empty `and: []` or `or: []` always returns 0 results.

#### Nested property filtering

```js
// Schema: { meta: { sales: 'number' } }
where: { 'meta.sales': { eq: 25 } }
```

#### Geopoint filters (see Section 5.7 for full geosearch docs)

```js
where: {
  location: {
    radius: {
      coordinates: { lat: 45.46, lon: 9.19 },
      unit: 'km',
      value: 1,
      inside: true,
    },
  },
}
```

---

### 5.5 Facets

Faceted search categorizes search results by field values. The `facets` property is supported in all three search modes. Open-source.

```typescript
facets?: Partial<Record<fieldName, FacetDefinition>>
```

#### String / Enum facets

```js
const results = await search(db, {
  term: 'laptop',
  facets: {
    category: {},                            // enum: no config needed
    author: { limit: 5, sort: 'asc' },      // string: with options
    'meta.tag': {},                          // nested path supported
  },
})

// Response shape
results.facets?.category
// { count: 3, values: { 't-shirt': 1, sweatshirt: 1, jeans: 1 } }
```

```typescript
interface StringFacetDefinition {
  limit?: number       // default: 10 — max values returned
  offset?: number      // default: 0  — skip N values
  sort?: 'asc' | 'desc' | 'ASC' | 'DESC'  // default: 'desc' (by doc count)
}
```

Sorting is only applied to `string`-type fields, not `enum` or `boolean`.

#### Number range facets

```js
const results = await search(db, {
  term: 'laptop',
  facets: {
    price: {
      ranges: [
        { from: 0, to: 100 },
        { from: 100, to: 500 },
        { from: 500, to: 2000 },
      ],
    },
  },
})

// Response — keys are "from-to" strings, range order is preserved
results.facets?.price
// { count: 3, values: { '0-100': 5, '100-500': 12, '500-2000': 3 } }
```

`ranges` is **required** for number fields — Orama does not auto-detect ranges. Both `from` and `to` are **inclusive**.

#### Boolean facets

```js
facets: {
  'meta.isFavorite': { true: true, false: false }
}
// Response: { count: 2, values: { 'true': 1, 'false': 2 } }
```

Boolean values are returned as string keys `'true'` and `'false'`.

#### Tips

- For array types (`string[]`, `number[]`, `enum[]`), each document is counted at most once per unique value
- Use `similarity: 0` with vector search to include all documents in facet counts
- Unsupported property types throw `FACET_NOT_SUPPORTED`
- Nested paths: `'meta.tag'`, `'meta.isFavorite'`

---

### 5.6 Fields Boosting

Boost the importance of specific fields in search results. Open-source.

```js
const searchResult = await search(db, {
  term: 'Harry',
  properties: '*',
  boost: {
    title: 2,       // matches in title count twice as much
    director: 1.5,  // matches in director count 1.5x as much
  },
})
```

- `boost` is a plain `Record<fieldName, number>`
- Fields not listed have an implicit weight of `1`
- Fractional values like `1.5` are valid
- Works in `fulltext` and `hybrid` modes (not `vector` mode)
- Combined with `relevance` (BM25 params) for fine-grained ranking control

```js
// Practical example with limit and threshold
const results = await search(db, {
  term: searchQuery,
  limit: 5,
  threshold: 0.2,
  boost: { title: 2 },
})
```

---

### 5.7 Geosearch

Geosearch finds documents by geographic proximity. Two modes: **radius** and **polygon**. Open-source, no Cloud required.

```typescript
// Schema — declare a geopoint field
const db = await create({
  schema: {
    name: 'string',
    location: 'geopoint',   // type literal: 'geopoint'
  } as const,
})

// Insert with coordinate object { lat, lon } — NOT GeoJSON [lon, lat] array
await insert(db, { name: 'Duomo di Milano', location: { lat: 45.464, lon: 9.192 } })
```

#### Radius search

```js
const results = await search(db, {
  term: 'Duomo',
  where: {
    location: {
      radius: {
        coordinates: { lat: 45.465, lon: 9.190 },
        unit: 'km',      // 'cm' | 'm' | 'km' | 'ft' | 'yd' | 'mi' — default: 'm'
        value: 1,
        inside: true,    // true = inside radius (default); false = outside
        highPrecision: false,  // true = Vincenty formula; false = Haversine (default)
      },
    },
  },
})
```

#### Polygon search

```js
const results = await search(db, {
  term: '',
  where: {
    location: {
      polygon: {
        coordinates: [
          { lat: 45.47, lon: 9.18 },
          { lat: 45.47, lon: 9.20 },
          { lat: 45.45, lon: 9.20 },
          { lat: 45.45, lon: 9.18 },
          { lat: 45.47, lon: 9.18 },  // MUST close the polygon (= first point)
        ],
        inside: true,
        highPrecision: true,
      },
    },
  },
})
```

**Geosearch params:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `radius.coordinates` | `{lat,lon}` | — | Center point |
| `radius.value` | `number` | — | Radius length in `unit` |
| `radius.unit` | `string` | `'m'` | `'cm' \| 'm' \| 'km' \| 'ft' \| 'yd' \| 'mi'` |
| `radius.inside` | `boolean` | `true` | `false` = find points OUTSIDE the radius |
| `radius.highPrecision` | `boolean` | `false` | Vincenty formula (WGS-84 ellipsoid) vs Haversine |
| `polygon.coordinates` | `{lat,lon}[]` | — | Polygon boundary; first = last point to close |
| `polygon.inside` | `boolean` | `true` | `false` = find points OUTSIDE the polygon |
| `polygon.highPrecision` | `boolean` | `false` | Vincenty formula for precision |

Internally uses a **BKD Tree** for efficient spatial indexing. Results sorted by distance from center/centroid by default.

---

### 5.8 Results Pinning (Merchandising)

Promotes specific documents to chosen positions in search results when the search term matches defined conditions. Available from **Orama v3.1.16**. Open-source, no Cloud required.

```typescript
type PinAnchoring = 'is' | 'starts_with' | 'contains'
// All comparisons: case-insensitive, whitespace-trimmed

interface PinRule {
  id: string
  conditions: PinCondition[]         // ALL conditions must match (AND logic)
  consequence: {
    promote: PinPromotion[]          // 'promote' is the only consequence type
  }
}

interface PinCondition {
  anchoring: PinAnchoring
  pattern: string
}

interface PinPromotion {
  doc_id: string    // document ID to promote
  position: number  // zero-based index in results.hits
}
```

| `anchoring` | Behavior |
|---|---|
| `'is'` | Exact match: `normalizedTerm === normalizedPattern` |
| `'starts_with'` | Prefix: `normalizedTerm.startsWith(normalizedPattern)` |
| `'contains'` | Substring: `normalizedTerm.includes(normalizedPattern)` |

```js
import { insertPin, updatePin, deletePin, getPin, getAllPins } from '@orama/orama'

// Create a rule — throws PINNING_RULE_ALREADY_EXISTS if id exists
insertPin(db, {
  id: 'featured-products',
  conditions: [{ anchoring: 'contains', pattern: 'featured' }],
  consequence: {
    promote: [
      { doc_id: 'product-2', position: 0 },
      { doc_id: 'product-5', position: 1 },
    ],
  },
})

// Replace a rule (full replacement, not merge) — throws PINNING_RULE_NOT_FOUND if missing
updatePin(db, { id: 'featured-products', conditions: [...], consequence: { promote: [...] } })

// Remove a rule — returns true if deleted, false if not found
deletePin(db, 'featured-products')

// Retrieve one rule
const rule = getPin(db, 'featured-products')

// Retrieve all rules
const allRules = getAllPins(db)
```

Rules are stored in a `Map<string, PinRule>` and support serialization via `save()`/`load()` for persistence plugins.

---

## 6. Answer Engine

The AI Answer Engine provides ChatGPT/Perplexity-style conversational search. **Requires Orama Cloud.** Not available in OSS mode (`disableChat` is hardcoded to `true`).

```bash
npm install @oramacloud/client
```

```typescript
import { OramaClient } from '@oramacloud/client'

const client = new OramaClient({
  endpoint: '<Your Orama Cloud Endpoint>',
  api_key: '<Your Orama Cloud API Key>',
})

const session = client.createAnswerSession({
  inferenceType: 'documentation',  // only supported value
  userContext: { name: 'User', plan: 'pro' },
  systemPrompts: ['You are a helpful documentation assistant'],
  events: {
    onMessageChange(messages) { /* Message[] */ },
    onMessageLoading(loading) { /* boolean */ },
    onAnswerAborted(aborted) { /* boolean */ },
    onSourceChange(sources) { /* Results<T> */ },
    onQueryTranslated(query) { /* SearchParams */ },
    onRelatedQueries(queries) { /* string[] */ },
    onNewInteractionStarted(interactionId) { /* string */ },
    onStateChange(state) { /* Interaction[] */ },
    onInteractionDone(interaction) { /* Interaction */ },
  },
})
```

### Methods

```typescript
// Wait for complete response string
const response = await session.ask({
  term: 'How do I configure search?',
  related: {
    howMany: 3,        // 1–5 max
    format: 'question' // 'question' | 'query'
  },
})

// Stream response chunks via async generator
const stream = await session.askStream({ term: 'How do I install Orama?' })
for await (const chunk of stream) {
  process.stdout.write(chunk)
}

session.abortAnswer()             // cancel in-flight request
session.getMessages()             // Message[] — full conversation history
session.clearSession()            // reset messages and state
await session.regenerateLast({ stream: false })  // re-run last query

session.setSystemPromptConfiguration({ systemPrompts: ['...'] })
session.getSystemPromptConfiguration()
```

### SSE stream message types (internal)

| `type` | Content |
|---|---|
| `'sources'` | Search results used as LLM context |
| `'query-translated'` | Query as translated for vector/hybrid |
| `'conversation-metadata'` | `segment` and `trigger` analytics fields |
| `'related-queries'` | Suggested follow-up queries |
| `'text'` | Streamed answer text chunks |

### Open-source AnswerSession

Available since `@orama/orama` v3.0.0 but requires `@orama/plugin-secure-proxy`. Not independently self-hostable.

```js
import { create, insert, AnswerSession } from '@orama/orama'
import { pluginSecureProxy } from '@orama/plugin-secure-proxy'

const secureProxy = await pluginSecureProxy({
  apiKey: 'my-api-key',
  defaultProperty: 'embeddings',
  models: { chat: 'openai/gpt-4o-mini' },
})

const db = await create({ schema: { name: 'string' }, plugins: [secureProxy] })
await insert(db, { name: 'John Doe' })

const session = new AnswerSession(db, {
  systemPrompt: 'Provide a greeting message',
  events: { onStateChange: console.log },
})

const response = await session.ask({ term: 'john' })
```

Throws `PLUGIN_SECURE_PROXY_NOT_FOUND` if secure proxy plugin is missing. Throws `PLUGIN_SECURE_PROXY_MISSING_CHAT_MODEL` if no chat model is configured.

**Note:** AI Answer Session does NOT work in staging environments — requires the production Orama Cloud endpoint.

### Orama Cloud vs OSS — feature matrix

| Feature | OSS Mode | Cloud Mode |
|---|---|---|
| Index location | Browser (client-side gzip) | 300 global edge locations |
| Embedding generation | `@orama/plugin-embeddings` (TF.js, 512-dim) | Automatic on ingest |
| AI Answer Engine | Disabled (hardcoded) | Enabled (production only) |
| Analytics | Via `plugins.analytics` | Built-in dashboard |
| Vector / hybrid search | Not supported via plugin | Supported |
| Scheduled updates | None | 30min / hourly / daily / weekly |

---

## 7. Plugin System

Orama has a plugin system for extending search behavior. Plugins are passed to `create()` at database creation time.

```typescript
type OramaPluginSync<T = unknown> = {
  name: string
  extra?: T
  beforeInsert?: (orama, id, doc) => SyncOrAsyncValue
  afterInsert?: (orama, id, doc) => SyncOrAsyncValue
  beforeRemove?: (orama, id, doc) => SyncOrAsyncValue
  afterRemove?: (orama, id, doc) => SyncOrAsyncValue
  beforeUpdate?: (orama, id, doc) => SyncOrAsyncValue
  afterUpdate?: (orama, id, doc) => SyncOrAsyncValue
  beforeSearch?: (orama, params, language) => SyncOrAsyncValue
  afterSearch?: (orama, params, language, results) => SyncOrAsyncValue
  beforeInsertMultiple?: (orama, docs) => SyncOrAsyncValue
  afterInsertMultiple?: (orama, docs) => SyncOrAsyncValue
  afterCreate?: (orama) => SyncOrAsyncValue
  getComponents?: (schema) => SyncOrAsyncValue<Partial<ObjectComponents>>
}

type OramaPlugin<T = unknown> = OramaPluginSync<T> | Promise<OramaPluginSync<T>>
```

```js
// Custom plugin example
const myPlugin = {
  name: 'my-plugin',
  beforeSearch(orama, params, language) {
    // mutate params before search executes
  },
  afterSearch(orama, params, language, results) {
    // post-process results
  },
  afterCreate(orama) {
    // run setup logic after DB creation
  },
}

const db = create({ schema: { title: 'string' }, plugins: [myPlugin] })
```

### Official plugins

| Plugin | Description | Cloud? |
|---|---|---|
| `@orama/plugin-embeddings` | Local TF.js embedding generation (512-dim) | No |
| `@orama/plugin-secure-proxy` | Cloud embedding/chat proxy (multiple models) | Yes (free) |
| `@orama/plugin-docusaurus-v3` | Docusaurus v3 search integration | No (OSS) / Optional |
| `@orama/plugin-docusaurus` | Docusaurus v2 only — do NOT use for v3 | No |
| `@orama/plugin-analytics` | Search analytics tracking | Yes |
| `@orama/plugin-match-highlight` | Search result match highlighting | No |
| `@orama/plugin-data-persistence` | Store/restore DB data | No |
| `@orama/plugin-vitepress` | VitePress framework integration | No |

### Docusaurus plugin lifecycle hooks

`plugin-docusaurus-v3` registers these Docusaurus lifecycle hooks:

- `configureWebpack` — returns empty config
- `getThemePath` — returns `'../dist/theme'` (installs custom SearchBar)
- `getClientModules` — returns `['../dist/theme/SearchBar/index.css']`
- `allContentLoaded` — reads docs/blog/pages, builds/syncs the index, sets global data
- `postBuild` — copies gzipped index file to output directory (OSS mode only)

---

## 8. Common Mistakes

### 1. Adding CSS class/element selectors to `custom.css`

```css
/* FAILS SILENTLY — external CSS cannot pierce Shadow DOM */
.orama-search-box { background: blue; }
[id^=orama-ui] button { color: red; }
[id^=orama-ui] input { font-size: 16px; }
```

Fix: Use CSS custom properties (`--variable-name`) or `themeConfig`.

### 2. Using `--orama-` prefix on theming variables

```css
/* WRONG — these variables do not exist */
--orama-background-color-primary: #fff;
--orama-text-color: #111;
```

Fix: Variables have NO prefix: `--background-color-primary`, `--text-color-primary`.

### 3. Targeting Docusaurus dark mode selector for Orama

```css
/* WRONG — Orama dark mode is .theme-dark, not [data-theme="dark"] */
[data-theme="dark"] [id^=orama-ui] { --background-color-primary: #000; }
```

Fix:
```css
[id^="orama-ui"].theme-dark { --background-color-primary: #0d1117; }
```

### 4. Using the wrong package name

```bash
npm install @orama/plugin-docusaurus   # WRONG — Docusaurus v2 package
npm install @orama/plugin-docusaurus-v3 # CORRECT for Docusaurus v3
```

### 5. Expecting AI chat in OSS mode

`disableChat` is hardcoded to `true` in OSS mode. AI chat requires `cloud.collectionId` or `cloud.indexId`.

### 6. Omitting `cloud.deploy` and seeing stale search results

Without `deploy: 'default'`, documents are indexed but no deployment is triggered. The live search index is unchanged.

### 7. Using `plugins.analytics` in Cloud mode

Analytics via `plugins.analytics` only applies in OSS mode. The config key is silently ignored in Cloud mode.

### 8. Blog-only mode crash

If `docs: false` (blog-only site), the plugin crashes with `Cannot read properties of undefined (reading 'map')`. Workaround: keep docs enabled.

### 9. AI Answer Session in staging

The AI Answer Session requires the production Orama Cloud endpoint. Hardcoded to fail in staging.

### 10. Vector search in OSS mode

Vector/hybrid search is NOT supported in OSS (local) mode via the Docusaurus plugin. It requires Cloud mode for embedding generation.

### 11. Mixing `exact: true` with `tolerance`

`exact` and `tolerance` are mutually exclusive. `exact` always takes priority. Do not set both.

### 12. Number filter combining multiple operators

```js
where: { rating: { gt: 4, lte: 10 } }  // THROWS: INVALID_FILTER_OPERATION
```

Use one operator per field, or use `between`:

```js
where: { rating: { between: [4, 10] } }
```

### 13. Empty `and`/`or` arrays return zero results

```js
where: { and: [] }  // always returns 0 results — not all documents
```

### 14. Closing a polygon

Polygon `coordinates` must have the first and last point identical to close the polygon.

### 15. `enum[]` field filter operators

`eq`, `in`, `nin` do NOT work on `enum[]` fields. Use `containsAll` or `containsAny`.

---

## 9. Quick Reference

### All major search parameters

| Parameter | Modes | Default | Description |
|---|---|---|---|
| `term` | all | — | Search query text |
| `mode` | all | `'fulltext'` | `'fulltext' \| 'vector' \| 'hybrid'` |
| `properties` | fulltext, hybrid | `'*'` | Fields to search |
| `limit` | all | `10` | Max results |
| `offset` | all | `0` | Pagination skip |
| `tolerance` | fulltext, hybrid | `0` | Levenshtein distance (typo tolerance) |
| `exact` | fulltext | `false` | Whole-word exact match only |
| `threshold` | fulltext, hybrid | `1` | Min BM25 score (0–1) |
| `relevance.k` | fulltext, hybrid | `1.2` | BM25 TF saturation |
| `relevance.b` | fulltext, hybrid | `0.75` | BM25 length normalization |
| `relevance.d` | fulltext, hybrid | `0.5` | BM25 delta/score floor |
| `boost` | fulltext, hybrid | — | `{field: multiplier}` per-field weight |
| `vector.value` | vector, hybrid | — | Embedding array |
| `vector.property` | vector, hybrid | — | Schema field for stored vectors |
| `similarity` | vector, hybrid | `0.8` | Min cosine similarity (0–1) |
| `hybridWeights` | hybrid | `{text:0.5, vector:0.5}` | Text vs vector weighting |
| `where` | all | — | Filter predicates |
| `facets` | all | — | Facet aggregation config |
| `sortBy` | fulltext | — | Custom sort order |
| `distinctOn` | fulltext | — | Deduplicate by field |
| `preflight` | fulltext | `false` | Count+facets only, no hits |
| `includeVectors` | vector, hybrid | `false` | Return raw vectors in hits |

### CSS custom properties (most common)

| Variable | Description |
|---|---|
| `--background-color-primary` | Main background |
| `--background-color-secondary` | Secondary background |
| `--background-color-accent` | Accent/highlight background |
| `--text-color-primary` | Main text color |
| `--text-color-secondary` | Secondary text color |
| `--button-background-color-primary` | Primary button background |
| `--border-color-accent` | Accent border color |
| `--font-primary` | Main font family |
| `--radius-m` | Medium border radius |
| `--radius-l` | Large border radius |
| `--radius-3xl` | Extra-large border radius |
| `--textarea-radius` | Textarea border radius |
| `--textarea-shadow` | Textarea box shadow |
| `--orama-base-font-size` | Base font size (divisor for rem; default: 16) |

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `ORAMA_CLOUD_BASE_URL` | `https://cloud.oramasearch.com/api/v1` | Override cloud API base URL (legacy `indexId` mode only) |

### Cloud REST index management

```js
import { IndexManager } from "@oramacloud/client"

const index = new IndexManager({ api_key: 'PRIVATE_KEY', index_id: 'YOUR_INDEX_ID' })

await index.snapshot([{ id: '1', title: 'Doc', body: 'Content' }])  // full replacement
await index.insert([{ id: 'doc-1', title: 'New page', body: '...' }])
await index.update([{ id: 'doc-1', title: 'Updated page', body: '...' }])
await index.delete(['doc-1', 'doc-2'])
await index.deploy()  // push all queued changes live
```

Documents are inserted in chunks of 50 per batch.

### Upgrading to Cloud

1. Create account at [app.orama.com](https://app.orama.com)
2. Create project and collection; choose data source
3. Generate Public API key (safe to expose) and Private API key (server-side only)
4. Add `cloud` block to `docusaurus.config.js`
5. Set `ORAMA_CLOUD_BASE_URL` env var in CI if needed (legacy `indexId` mode only)
