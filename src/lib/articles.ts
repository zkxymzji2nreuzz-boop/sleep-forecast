/**
 * SEO 記事の読み込みユーティリティ。
 *
 * IMPORTANT: このファイルは Node.js の `fs` / `path` を使用するため、
 * Server Components / Route Handlers / `generateStaticParams` /
 * `generateMetadata` からのみ import できる。
 * `'use client'` コンポーネントからは絶対に import しないこと。
 *
 * 記事ソース: `src/content/articles/<slug>.md`
 * - frontmatter: gray-matter でパース
 * - 本文: unified + remark-parse + remark-gfm + remark-rehype + rehype-stringify で HTML 化
 */

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";

import type { ArticleMeta, ArticleFull } from "./types";

/** 記事 Markdown ファイルが置かれているディレクトリ */
const ARTICLES_DIR = path.join(process.cwd(), "src", "content", "articles");

/**
 * 全記事スラッグの一覧を返す (拡張子なし)。
 * `src/content/articles/*.md` の basename を列挙する。
 */
export function getAllArticleSlugs(): string[] {
  if (!fs.existsSync(ARTICLES_DIR)) {
    return [];
  }
  return fs
    .readdirSync(ARTICLES_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}

/**
 * フロントマターを型安全に正規化する。
 * 必須フィールドが欠けている場合は throw する (ビルド時にエラーとして検出したい)。
 */
function normalizeFrontMatter(
  slug: string,
  data: Record<string, unknown>
): ArticleMeta {
  const pick = (key: string): string => {
    const v = data[key];
    if (typeof v !== "string" || v.trim() === "") {
      throw new Error(
        `[articles] frontmatter "${key}" missing in article "${slug}"`
      );
    }
    return v;
  };

  const tagsRaw = data.tags;
  const relatedRaw = data.relatedSlugs;
  const wordCountRaw = data.wordCount;

  return {
    slug,
    title: pick("title"),
    description: pick("description"),
    publishedAt: pick("publishedAt"),
    updatedAt: pick("updatedAt"),
    category: pick("category"),
    tags: Array.isArray(tagsRaw)
      ? tagsRaw.filter((t): t is string => typeof t === "string")
      : [],
    relatedSlugs: Array.isArray(relatedRaw)
      ? relatedRaw.filter((t): t is string => typeof t === "string")
      : [],
    wordCount:
      typeof wordCountRaw === "number" ? wordCountRaw : undefined,
  };
}

/**
 * 全記事のメタデータのみを返す。
 * `publishedAt` の降順 (新しい順) でソートする。
 */
export function getAllArticlesMeta(): ArticleMeta[] {
  return getAllArticleSlugs()
    .map((slug) => {
      const filePath = path.join(ARTICLES_DIR, `${slug}.md`);
      const raw = fs.readFileSync(filePath, "utf8");
      const { data } = matter(raw);
      return normalizeFrontMatter(slug, data);
    })
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

/**
 * 指定スラッグの記事を frontmatter + HTML 本文セットで返す。
 * 記事が存在しない場合は null を返す (呼び出し側で notFound() する)。
 */
export async function getArticleBySlug(
  slug: string
): Promise<ArticleFull | null> {
  const filePath = path.join(ARTICLES_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  const meta = normalizeFrontMatter(slug, data);

  // remark → rehype のパイプラインで Markdown を HTML 化
  const processed = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug) // H2/H3 に id を付与 (目次リンク用)
    .use(rehypeStringify)
    .process(content);

  return {
    ...meta,
    contentHtml: String(processed),
  };
}

/**
 * 関連記事メタデータを取得する。存在しないスラッグは無視する。
 */
export function getRelatedArticles(slugs: string[]): ArticleMeta[] {
  if (!Array.isArray(slugs) || slugs.length === 0) return [];
  const all = getAllArticlesMeta();
  const bySlug = new Map(all.map((a) => [a.slug, a]));
  return slugs
    .map((s) => bySlug.get(s))
    .filter((a): a is ArticleMeta => Boolean(a));
}
