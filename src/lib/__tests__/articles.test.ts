/**
 * F005 SEO 記事システム — articles.ts ユニットテスト
 */

import { describe, it, expect } from "vitest";
import {
  getAllArticleSlugs,
  getAllArticlesMeta,
  getArticleBySlug,
  getRelatedArticles,
  extractTocFromHtml,
} from "../articles";

const EXPECTED_SLUGS = [
  "kiatsu-zutsu",
  "suimin-shitsu-up",
  "tsuki-to-suimin",
  "kandansa-hirou",
  "fuminshou-sign",
  "jiritsu-shinkei",
  "suimin-fusai",
  "blue-light",
  "gaba-supplement",
  "kisho-byo-check",
];

// ---------------------------------------------------------------------------
// getAllArticleSlugs
// ---------------------------------------------------------------------------
describe("getAllArticleSlugs", () => {
  it("happy: 10 件のスラッグを返す", () => {
    const slugs = getAllArticleSlugs();
    expect(slugs).toHaveLength(10);
    for (const slug of EXPECTED_SLUGS) {
      expect(slugs).toContain(slug);
    }
  });

  it("happy: 返り値の全要素が文字列", () => {
    const slugs = getAllArticleSlugs();
    for (const s of slugs) {
      expect(typeof s).toBe("string");
    }
  });

  it("edge: .md 拡張子を含まない", () => {
    const slugs = getAllArticleSlugs();
    for (const s of slugs) {
      expect(s).not.toMatch(/\.md$/);
    }
  });
});

// ---------------------------------------------------------------------------
// getAllArticlesMeta
// ---------------------------------------------------------------------------
describe("getAllArticlesMeta", () => {
  it("happy: 10 件のメタデータを返す", () => {
    const metas = getAllArticlesMeta();
    expect(metas).toHaveLength(10);
  });

  it("happy: publishedAt 降順でソートされている", () => {
    const metas = getAllArticlesMeta();
    for (let i = 0; i < metas.length - 1; i++) {
      expect(metas[i].publishedAt >= metas[i + 1].publishedAt).toBe(true);
    }
  });

  it("happy: 各メタデータに必須フィールドが揃っている", () => {
    const metas = getAllArticlesMeta();
    for (const m of metas) {
      expect(m.slug).toBeTruthy();
      expect(m.title).toBeTruthy();
      expect(m.description).toBeTruthy();
      expect(m.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(m.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(m.category).toBeTruthy();
      expect(Array.isArray(m.tags)).toBe(true);
      expect(Array.isArray(m.relatedSlugs)).toBe(true);
    }
  });

  it("edge: 全スラッグが含まれる", () => {
    const slugs = getAllArticlesMeta().map((m) => m.slug);
    for (const slug of EXPECTED_SLUGS) {
      expect(slugs).toContain(slug);
    }
  });
});

// ---------------------------------------------------------------------------
// getArticleBySlug
// ---------------------------------------------------------------------------
describe("getArticleBySlug", () => {
  it("happy: kiatsu-zutsu が正しいタイトルを返す", async () => {
    const article = await getArticleBySlug("kiatsu-zutsu");
    expect(article).not.toBeNull();
    expect(article!.title).toBe("低気圧頭痛のメカニズムと気圧変化への対策");
  });

  it("happy: contentHtml が空でない", async () => {
    const article = await getArticleBySlug("kiatsu-zutsu");
    expect(article).not.toBeNull();
    expect(article!.contentHtml.trim().length).toBeGreaterThan(0);
  });

  it("happy: contentHtml が HTML タグを含む (remark→rehype 変換済み)", async () => {
    const article = await getArticleBySlug("kiatsu-zutsu");
    expect(article!.contentHtml).toMatch(/<[a-z]/);
  });

  it("edge: 存在しないスラッグで null を返す", async () => {
    const article = await getArticleBySlug("does-not-exist");
    expect(article).toBeNull();
  });

  it("happy: suimin-shitsu-up も取得できる", async () => {
    const article = await getArticleBySlug("suimin-shitsu-up");
    expect(article).not.toBeNull();
    expect(article!.slug).toBe("suimin-shitsu-up");
  });

  it("happy: 新規記事 kandansa-hirou が取得できる", async () => {
    const article = await getArticleBySlug("kandansa-hirou");
    expect(article).not.toBeNull();
    expect(article!.slug).toBe("kandansa-hirou");
    expect(article!.toc.length).toBeGreaterThanOrEqual(3);
  });

  it("happy: toc プロパティが存在し TocItem[] 型である", async () => {
    const article = await getArticleBySlug("kiatsu-zutsu");
    expect(article).not.toBeNull();
    expect(Array.isArray(article!.toc)).toBe(true);
    for (const item of article!.toc) {
      expect(typeof item.id).toBe("string");
      expect(typeof item.text).toBe("string");
      expect(item.level).toBe(2);
    }
  });
});

// ---------------------------------------------------------------------------
// getRelatedArticles
// ---------------------------------------------------------------------------
describe("getRelatedArticles", () => {
  it("happy: 有効なスラッグで対応するメタデータを返す", () => {
    const related = getRelatedArticles(["kiatsu-zutsu", "tsuki-to-suimin"]);
    expect(related).toHaveLength(2);
    const slugs = related.map((r) => r.slug);
    expect(slugs).toContain("kiatsu-zutsu");
    expect(slugs).toContain("tsuki-to-suimin");
  });

  it("edge: 存在しないスラッグは無視する", () => {
    const related = getRelatedArticles(["kiatsu-zutsu", "nonexistent-slug"]);
    expect(related).toHaveLength(1);
    expect(related[0].slug).toBe("kiatsu-zutsu");
  });

  it("edge: 空配列を渡したら空配列を返す", () => {
    expect(getRelatedArticles([])).toEqual([]);
  });

  it("edge: 全スラッグが不正なら空配列を返す", () => {
    const related = getRelatedArticles(["bad-slug-1", "bad-slug-2"]);
    expect(related).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// extractTocFromHtml
// ---------------------------------------------------------------------------
describe("extractTocFromHtml", () => {
  it("happy: H2 見出しを正しく抽出する", () => {
    const html = `
      <h2 id="first">最初の見出し</h2>
      <p>段落</p>
      <h2 id="second">2 番目の見出し</h2>
      <h3 id="sub">サブ見出し</h3>
      <h2 id="third">3 番目の見出し</h2>
    `;
    const toc = extractTocFromHtml(html);
    expect(toc).toHaveLength(3);
    expect(toc[0]).toEqual({ id: "first", text: "最初の見出し", level: 2 });
    expect(toc[1]).toEqual({ id: "second", text: "2 番目の見出し", level: 2 });
    expect(toc[2]).toEqual({ id: "third", text: "3 番目の見出し", level: 2 });
  });

  it("happy: 子タグを除去してテキストだけを抽出する", () => {
    const html = `<h2 id="linked"><a href="#">リンク付き見出し</a></h2>`;
    const toc = extractTocFromHtml(html);
    expect(toc).toHaveLength(1);
    expect(toc[0].text).toBe("リンク付き見出し");
  });

  it("edge: id 属性がない H2 はスキップする", () => {
    const html = `<h2>id なし</h2><h2 id="valid">あり</h2>`;
    const toc = extractTocFromHtml(html);
    expect(toc).toHaveLength(1);
    expect(toc[0].id).toBe("valid");
  });

  it("edge: H2 がない場合は空配列を返す", () => {
    const html = `<h3 id="sub">見出し</h3><p>段落</p>`;
    const toc = extractTocFromHtml(html);
    expect(toc).toEqual([]);
  });
});
