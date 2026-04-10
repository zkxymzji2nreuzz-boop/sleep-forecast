# F005 Design Winner Directive

**Adopted base: Designer B (wellness-emotional)**
**Hybrid steals from: Designer A**

---

## Scoring Table

| Axis | A (editorial) | B (wellness) | C (data-sci) |
|---|---|---|---|
| Readability | 8/10 | 9/10 | 7/10 |
| Information scent | 7/10 | 8/10 | 8/10 |
| Brand consistency | 5/10 | 10/10 | 4/10 |
| Accessibility | 9/10 | 9/10 | 7/10 |
| Implementation risk | 8/10 | 9/10 | 6/10 |
| Content-type fit | 7/10 | 9/10 | 6/10 |
| **Total** | **44/60** | **54/60** | **38/60** |

---

## Decision: B as base, steal A's reading measure and prose leading

### Hybrid moves from A

1. **Narrow the column**: Change `max-w-screen-md` to `max-w-[680px]` in both
   `ArticleLayout` and `ArticlesIndexPage`. The current ~768px is too wide for
   17px body text (~85ch). 680px lands on the research-backed 60–75ch sweet spot.
2. **Back link copy**: Use B's softer `ほかの読みものを見る` over the current
   `記事一覧に戻る`.
3. **Prose leading**: Use `prose-p:leading-[1.9]` (B's value) instead of the
   current default. A's `leading-[1.85]` is acceptable but B's 1.9 reads better
   for Japanese long-form.

---

## Generator Implementation Instructions

### 1. `src/app/articles/page.tsx`

**Container class** — change outer div:
```
// BEFORE
"container mx-auto max-w-screen-md px-4 pb-16 pt-10"

// AFTER
"container mx-auto max-w-[680px] px-5 pb-20 pt-16 sm:pt-20"
```

**Header** — replace `<header>` block:
- Add hero background gradient above h1:
  wrap header content in `<div className="relative">` with a sibling
  `<div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 rounded-b-[3rem] bg-gradient-to-b from-indigo-500/[0.06] via-purple-500/[0.03] to-transparent" aria-hidden="true" />`
- H1 class: change to `text-3xl sm:text-4xl font-bold tracking-tight text-[#e6e8ee]`
- Intro text: change to `mt-3 text-sm sm:text-base text-[#8b92a5] leading-relaxed`
  and copy: `気圧、気温、月のリズム。眠りの奥にある自然の声に、そっと耳を澄ませる読みものを集めました。`
- Eyebrow: keep Moon icon, add Cloud icon alongside:
  `<Moon className="h-4 w-4" aria-hidden="true" /><Cloud className="h-3.5 w-3.5" aria-hidden="true" />`
  add import for `Moon, Cloud` from lucide-react (remove `BookOpen`)

**Article card list** — replace current `<Link>` card class:
```
// BEFORE
"group block rounded-2xl border border-white/10 bg-white/[0.03] p-5
 transition-colors hover:border-[#1d9bf0]/50 hover:bg-white/[0.06]"

// AFTER
"group relative block overflow-hidden rounded-3xl border border-white/[0.08]
 bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-transparent p-6
 transition-all duration-500 ease-out
 hover:border-indigo-300/30
 hover:from-indigo-500/10 hover:via-purple-500/[0.08] hover:to-rose-500/5
 hover:shadow-[0_8px_30px_-12px_rgba(124,77,255,0.25)]
 hover:-translate-y-0.5"
```

**Left accent bar** — add inside each card Link (first child):
```tsx
<span
  aria-hidden="true"
  className="pointer-events-none absolute inset-y-0 left-0 w-[3px]
             bg-gradient-to-b from-indigo-400 to-purple-400 opacity-0
             transition-opacity duration-500 group-hover:opacity-100"
/>
```

**Category pill** — replace the plain span category label:
```
// BEFORE
<span>{a.category}</span>

// AFTER
<span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px]
                 font-medium text-indigo-200/80 border border-indigo-300/15">
  {a.category}
</span>
```
Remove the `· <time>` separator; move date to its own `<time>` element with
`Calendar` icon styled `text-[11px] text-[#8b92a5]`.

**Arrow CTA** — change translate distance:
```
// BEFORE
group-hover:translate-x-0.5

// AFTER
group-hover:translate-x-1
```

**Disclaimer** — replace `<p>` with:
```tsx
<div className="mt-14 rounded-2xl border border-white/[0.06]
                bg-white/[0.02] p-5">
  <div className="flex items-start gap-2">
    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8b92a5]"
          aria-hidden="true" />
    <p className="text-xs leading-relaxed text-[#8b92a5]">
      本サービスで提供する記事は一般的な情報提供を目的としたものであり、
      医学的な診断・治療の代替ではありません。
      体調に不安がある場合は、必ず医療機関にご相談ください。
    </p>
  </div>
</div>
```
Add `Info` to lucide-react imports.

---

### 2. `src/components/ArticleLayout.tsx`

**Container class**:
```
// BEFORE
"container mx-auto max-w-screen-md px-4 pb-16 pt-8"

// AFTER
"container mx-auto max-w-[680px] px-5 pb-20 pt-10 sm:pt-14"
```

**Back link**:
```
// BEFORE  (text + copy)
className="inline-flex items-center gap-1.5 text-sm text-[#8b92a5] transition-colors hover:text-[#1d9bf0]"
記事一覧に戻る

// AFTER
className="mb-10 inline-flex min-h-[44px] items-center gap-1.5 text-[13px]
           text-[#8b92a5] transition-colors hover:text-[#e6e8ee]
           focus-visible:outline-none focus-visible:ring-2
           focus-visible:ring-indigo-300 focus-visible:ring-offset-2
           focus-visible:ring-offset-[#0f1117] rounded-sm"
ほかの読みものを見る
```

**Header** — replace `<header>` (border-b removal + gradient divider):
```
// BEFORE
<header className="mb-8 border-b border-white/10 pb-6">

// AFTER
<header className="relative mb-10">
```
After the closing of the meta row div and before `</header>`, add the gradient
divider in place of the old border-b:
```tsx
<div
  aria-hidden="true"
  className="mt-6 h-px bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent"
/>
```

**Category badge** — replace the existing BookOpen + category span with:
```tsx
<div className="mb-4 flex items-center gap-2">
  <BookOpen className="h-3.5 w-3.5 text-indigo-300" aria-hidden="true" />
  <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs
                   font-medium text-indigo-200/80 border border-indigo-300/20">
    {article.category}
  </span>
</div>
```

**H1 class**:
```
// BEFORE
"text-2xl font-bold leading-tight text-[#e6e8ee] sm:text-3xl"

// AFTER
"text-[28px] font-bold leading-[1.35] tracking-tight text-[#e6e8ee] sm:text-[34px]"
```

**Tag pills** — replace the plain `#tag` span:
```
// BEFORE
className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-[#e6e8ee]/80"

// AFTER
className="rounded-full border border-indigo-300/20 bg-indigo-500/10
           px-2.5 py-0.5 text-[11px] text-indigo-200/80"
```

**Prose wrapper** — replace the prose className:
```
// BEFORE
"prose prose-invert max-w-none prose-headings:text-[#e6e8ee]
 prose-p:text-[#e6e8ee]/90 prose-a:text-[#1d9bf0] prose-strong:text-[#e6e8ee]
 prose-li:text-[#e6e8ee]/90 prose-h2:mt-10 prose-h2:border-l-4
 prose-h2:border-[#1d9bf0] prose-h2:pl-3 prose-h3:text-[#e6e8ee]"

// AFTER
"prose prose-invert prose-lg max-w-none
 prose-headings:text-[#e6e8ee] prose-headings:font-bold prose-headings:tracking-tight
 prose-h2:mt-14 prose-h2:mb-5 prose-h2:text-2xl prose-h2:leading-snug
 prose-h2:border-l-[3px] prose-h2:border-indigo-400/70 prose-h2:pl-4
 prose-h3:mt-10 prose-h3:text-xl prose-h3:text-[#e6e8ee]
 prose-p:text-[#e6e8ee]/90 prose-p:leading-[1.9]
 prose-li:text-[#e6e8ee]/90 prose-li:leading-[1.85] prose-li:my-1
 prose-a:text-indigo-300 prose-a:underline-offset-4 prose-a:decoration-indigo-400/40
 hover:prose-a:decoration-indigo-300
 prose-strong:text-[#e6e8ee] prose-strong:font-semibold
 prose-blockquote:border-l-indigo-400/60 prose-blockquote:text-[#e6e8ee]/80
 prose-blockquote:bg-indigo-500/[0.04] prose-blockquote:rounded-r-xl
 prose-blockquote:py-2 prose-blockquote:pr-4
 prose-code:text-indigo-200 prose-code:bg-white/[0.06]
 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md
 prose-code:before:content-none prose-code:after:content-none"
```

**CTA aside** — replace existing `<aside>`:
```tsx
<aside className="mt-14 rounded-3xl border border-indigo-300/25
                  bg-gradient-to-br from-indigo-500/15 via-purple-500/12 to-rose-500/8
                  p-7 shadow-[0_12px_40px_-16px_rgba(124,77,255,0.4)] sm:p-8">
  <div className="flex items-center gap-2">
    <Moon className="h-5 w-5 text-indigo-200" aria-hidden="true" />
    <h2 className="text-xl font-bold text-[#e6e8ee]">
      今夜の眠りを、明日の予報に。
    </h2>
  </div>
  <p className="mt-2 text-sm leading-relaxed text-[#e6e8ee]/80">
    毎朝たった 30 秒の記録から、気圧・気温・月齢があなたの眠りにどう響いているかを、
    やさしく見える化します。
  </p>
  <div className="mt-5">
    <Button
      asChild
      className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-500
                 px-6 py-3 font-medium text-white shadow-lg shadow-indigo-500/25
                 hover:from-indigo-400 hover:to-purple-400
                 focus-visible:ring-2 focus-visible:ring-indigo-300
                 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1117]"
    >
      <Link href="/record">今日の睡眠を記録する</Link>
    </Button>
  </div>
</aside>
```
Add `Moon` to lucide-react imports.

**Related articles section** — replace `<section>` heading and card classes:
```
// Heading BEFORE
<h2 className="mb-4 text-base font-semibold text-[#e6e8ee]">関連記事</h2>

// Heading AFTER
<h2 className="mb-6 flex items-center gap-2 text-base font-semibold text-[#e6e8ee]">
  <Sparkles className="h-4 w-4 text-indigo-300" aria-hidden="true" />
  こちらの読みものもおすすめ
</h2>
```
Add `Sparkles` to lucide-react imports.

Related card Link class:
```
// BEFORE
"block rounded-xl border border-white/10 bg-white/[0.03] p-4
 transition-colors hover:border-[#1d9bf0]/50 hover:bg-white/[0.06]"

// AFTER
"block rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4
 transition-all duration-500
 hover:bg-gradient-to-br hover:from-indigo-500/8 hover:to-purple-500/5
 hover:border-indigo-300/25 hover:-translate-y-0.5"
```

Related card category label:
```
// BEFORE
"text-[10px] uppercase tracking-wide text-[#1d9bf0]"

// AFTER
"text-[10px] font-medium text-[#1d9bf0]"
```
(Remove uppercase — match B's softer Japanese label treatment for category.)

**Disclaimer** — replace `<p>` at bottom with same Info-icon pattern as index:
```tsx
<div className="mt-14 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
  <div className="flex items-start gap-2">
    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8b92a5]"
          aria-hidden="true" />
    <p className="text-xs leading-relaxed text-[#8b92a5]">
      本記事は一般的な情報提供を目的としたものであり、
      医学的な診断・治療の代替ではありません。
      体調に不安がある場合は、必ず医療機関にご相談ください。
    </p>
  </div>
</div>
```
Add `Info` to lucide-react imports (same file).

---

## Token Summary

| Token | Value |
|---|---|
| Column width | `max-w-[680px]` (both pages) |
| Card radius | `rounded-3xl` (index), `rounded-2xl` (related) |
| CTA radius | `rounded-3xl` |
| Button radius | `rounded-full` |
| Prose leading | `prose-p:leading-[1.9]` |
| H2 left accent | `border-l-[3px] border-indigo-400/70` |
| Hero gradient | `from-indigo-500/[0.06] via-purple-500/[0.03] to-transparent` |
| Card hover gradient | `from-indigo-500/10 via-purple-500/[0.08] to-rose-500/5` |
| CTA gradient | `from-indigo-500/15 via-purple-500/12 to-rose-500/8` |
| Accent bar | `from-indigo-400 to-purple-400` |
| Divider | `bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent h-px` |
| Focus ring | `ring-indigo-300 ring-offset-[#0f1117]` |

---

## Adoption Rationale

F003 (dashboard) and F004 (prediction card) both shipped on Design B's wellness
gradient language — indigo → purple → rose, rounded-3xl, breathing whitespace,
emotionally warm microcopy. Switching to A's stripped editorial style (no
gradients, single blue accent) would introduce a visible brand split precisely at
the point where users enter the long-form reading surface from the dashboard.
Continuity here strengthens trust.

Designer C was disqualified on two counts: (1) cyan as a second accent breaks
the established indigo/purple/rose palette and would require touching F003/F004
files to avoid clashing, adding implementation risk; (2) font-mono metadata
fields and "References" section labelling are too clinical for a 30–50s female
primary audience seeking emotional reassurance about sleep and weather pain.

The two hybrid steals from A are low-risk readability improvements that do not
conflict with B's visual language: the 680px measure and the 1.9 prose leading
both make articles easier to read on mobile without touching any colour or
gradient token.

Medical disclaimer text, font-size (`text-xs`), and accessibility requirements
(min-h tap targets, aria-hidden icons, focus-visible rings) are preserved
unchanged from the existing implementation.

---

*Judged by Design Judge Agent — 2026-04-10*
*Generator implements from this file. Do NOT modify F003/F004 source files.*
