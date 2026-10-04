import "@shoelace-style/shoelace/dist/shoelace.js";

type BlockType = "heading" | "paragraph" | "image" | "link";
type ReviewStatus = "pending" | "approved" | "needs-work";
type Severity = "error" | "warning" | "info";

interface CommentReply {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

interface CommentItem {
  id: string;
  author: string;
  body: string;
  createdAt: string;
  resolved: boolean;
  replies: CommentReply[];
}

interface ContentBlock {
  id: string;
  type: BlockType;
  text: string;
  accessibleText: string;
  headingLevel?: number;
  imageSrc?: string;
  imageAlt?: string;
  linkHref?: string;
  changeReason: string;
  reviewStatus: ReviewStatus;
  comments: CommentItem[];
  /** 内容标识：由类型与正文归一化得到，用于跨版本对齐，与块 id 和位置无关。 */
  contentKey: string;
  /** 新修订内容是否已被编辑确认；未确认的块不进入导出。 */
  confirmed: boolean;
}

type MergeItemKind = "same" | "changed" | "conflict" | "added" | "removed";

interface MergePlanItem {
  kind: MergeItemKind;
  oldBlock?: ContentBlock;
  newBlock?: ContentBlock;
  conflictId?: string;
}

interface MergeConflict {
  id: string;
  oldBlock: ContentBlock;
  newBlock: ContentBlock;
  note: string;
  resolution?: "old" | "new";
}

interface MergeSession {
  id: string;
  fileName: string;
  startedAt: string;
  plan: MergePlanItem[];
  conflicts: MergeConflict[];
  /** 旧稿独有块的处理决定：默认移除，可切换为保留。 */
  removedDecisions: Record<string, "drop" | "keep">;
}

interface GlossaryTerm {
  id: string;
  source: string;
  preferred: string;
  note: string;
}

interface VersionSnapshot {
  id: string;
  label: string;
  createdAt: string;
  blocks: ContentBlock[];
  glossary: GlossaryTerm[];
}

interface ChapterProject {
  id: string;
  title: string;
  subject: string;
  grade: string;
  blocks: ContentBlock[];
  glossary: GlossaryTerm[];
  versions: VersionSnapshot[];
  updatedAt: string;
}

interface AccessibilityIssue {
  id: string;
  blockId: string;
  type: "heading" | "link" | "image" | "glossary" | "sentence";
  severity: Severity;
  title: string;
  detail: string;
  suggestion: string;
}

const STORAGE_KEY = "sologsb-1009-accessible-textbook-v1";
const SCHEMA_VERSION = 2;
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/** 内容标识：类型 + 归一化正文（标题含层级、图片含地址、链接含目标），与块 id、顺序无关。 */
function blockKey(block: Pick<ContentBlock, "type" | "text" | "headingLevel" | "imageSrc" | "linkHref">) {
  const base = `${block.type}|${block.text.replace(/\s+/g, "")}`;
  if (block.type === "heading") return `${base}|H${block.headingLevel ?? 2}`;
  if (block.type === "image") return `${base}|${block.imageSrc ?? ""}`;
  if (block.type === "link") return `${base}|${block.linkHref ?? ""}`;
  return base;
}

/** 旧版本数据升级：补齐内容标识、确认标记与批注数组，保持原有改写与审核状态。 */
function migrateProject(raw: ChapterProject): ChapterProject {
  const project: ChapterProject = {
    ...raw,
    glossary: raw.glossary ?? [],
    versions: raw.versions ?? [],
    blocks: (raw.blocks ?? []).map((block) => ({
      ...block,
      comments: block.comments ?? [],
      confirmed: block.confirmed ?? true,
      contentKey: block.contentKey ?? blockKey(block),
    })),
  };
  return project;
}

function createSeedProject(): ChapterProject {
  const blocks: Array<Omit<ContentBlock, "contentKey" | "confirmed">> = [
    {
      id: "block-h1",
      type: "heading",
      headingLevel: 1,
      text: "第三章 水循环与城市",
      accessibleText: "第三章 水循环与城市",
      changeReason: "",
      reviewStatus: "approved",
      comments: [],
    },
    {
      id: "block-p1",
      type: "paragraph",
      text: "城市中的水并非取之不尽，由于其会通过蒸发、降水以及地表径流等若干复杂过程在自然界中持续循环，因此理解这些过程对于建设具有韧性的城市具有十分重要的意义。",
      accessibleText: "城市里的水会不断循环。它经过蒸发、降水并沿地面流动。了解这些过程，可以帮助我们建设更能适应变化的城市。",
      changeReason: "拆分长句，把抽象表述改为更直接的说明。",
      reviewStatus: "pending",
      comments: [],
    },
    {
      id: "block-h2",
      type: "heading",
      headingLevel: 2,
      text: "一、水从哪里来",
      accessibleText: "一、水从哪里来",
      changeReason: "保留原章节结构。",
      reviewStatus: "approved",
      comments: [],
    },
    {
      id: "block-img",
      type: "image",
      text: "图 3-1 城市水循环示意",
      imageSrc: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='420'%3E%3Crect width='800' height='420' fill='%23dcecf3'/%3E%3Ccircle cx='650' cy='85' r='45' fill='%23f4c95d'/%3E%3Cpath d='M0 300 Q180 240 340 300 T800 280 V420 H0Z' fill='%2389b7d0'/%3E%3Cpath d='M130 285 Q220 170 330 285' fill='none' stroke='%233a7c9e' stroke-width='12'/%3E%3C/svg%3E",
      imageAlt: "",
      accessibleText: "",
      changeReason: "",
      reviewStatus: "needs-work",
      comments: [],
    },
    {
      id: "block-p2",
      type: "paragraph",
      text: "当太阳照射到水面时，水会受热变成水蒸气升到空中。水蒸气冷却后形成云，再以雨或雪的形式落回地面。",
      accessibleText: "太阳照在水面上，水会变成水蒸气升到空中。水蒸气冷却后变成云，最后以雨或雪落回地面。",
      changeReason: "使用较短句子，并明确每个步骤的先后顺序。",
      reviewStatus: "approved",
      comments: [],
    },
    {
      id: "block-link",
      type: "link",
      text: "点击这里",
      linkHref: "/resources/water-cycle",
      accessibleText: "打开水循环互动实验",
      changeReason: "改为说明链接目标的独立文案。",
      reviewStatus: "pending",
      comments: [],
    },
    {
      id: "block-h3",
      type: "heading",
      headingLevel: 3,
      text: "雨水花园怎样工作",
      accessibleText: "雨水花园怎样工作",
      changeReason: "",
      reviewStatus: "approved",
      comments: [],
    },
    {
      id: "block-p3",
      type: "paragraph",
      text: "雨水花园利用土壤和植物的共同作用暂时储存雨水，同时通过下渗补给地下水，并在降雨较集中时减轻城市排水管道所承受的压力。",
      accessibleText: "雨水花园用土壤和植物暂时存住雨水。雨水还会慢慢渗入地下，补充地下水。雨很大时，它可以减轻排水管的压力。",
      changeReason: "把并列成分拆成短句，减少专业术语密度。",
      reviewStatus: "pending",
      comments: [],
    },
  ];

  return {
    id: "accessible-textbook-1009",
    title: "科学（五年级下册）·无障碍改写稿",
    subject: "科学",
    grade: "五年级",
    blocks: blocks.map((block) => ({ ...block, confirmed: true, contentKey: blockKey(block) })),
    glossary: [
      { id: "term-1", source: "水循环", preferred: "水循环", note: "全书统一使用" },
      { id: "term-2", source: "地表径流", preferred: "沿地面流动的水", note: "首次出现时使用通俗解释" },
      { id: "term-3", source: "下渗", preferred: "渗入地下", note: "避免单独使用专业词" },
    ],
    versions: [],
    updatedAt: new Date().toISOString(),
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseImportedChapter(input: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const lines = input.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      blocks.push(blankBlock("heading", heading[2], { headingLevel: heading[1].length }));
      continue;
    }
    const image = /^!\[([^\]]*)\]\(([^)]+)\)(?:\s+(.+))?$/.exec(line);
    if (image) {
      blocks.push(blankBlock("image", image[3] || "未命名图片", { imageSrc: image[2], imageAlt: image[1] }));
      continue;
    }
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(line);
    if (link) {
      blocks.push(blankBlock("link", link[1], { linkHref: link[2] }));
      continue;
    }
    blocks.push(blankBlock("paragraph", line));
  }
  return blocks.length ? blocks : [blankBlock("paragraph", input.trim() || "请输入章节内容")];
}

function blankBlock(type: BlockType, text: string, extra: Partial<ContentBlock> = {}): ContentBlock {
  const block: ContentBlock = {
    id: uid("block"),
    type,
    text,
    accessibleText: type === "image" ? extra.imageAlt ?? "" : text,
    changeReason: "",
    reviewStatus: "pending",
    comments: [],
    confirmed: false,
    contentKey: "",
    ...extra,
  };
  block.contentKey = extra.contentKey ?? blockKey(block);
  return block;
}

function sentenceLength(text: string) {
  const normalized = text.replace(/\s+/g, "");
  return /[A-Za-z]/.test(text) ? text.trim().split(/\s+/).length : normalized.length;
}

/** 二字组 Dice 相似度，用于在位置/类型对不上时猜测新旧块的对应关系。 */
function textSimilarity(a: string, b: string) {
  const na = a.replace(/\s+/g, "");
  const nb = b.replace(/\s+/g, "");
  if (!na.length || !nb.length) return 0;
  if (na === nb) return 1;
  const grams = (value: string) => {
    const map = new Map<string, number>();
    for (let index = 0; index < value.length - 1; index += 1) {
      const gram = value.slice(index, index + 2);
      map.set(gram, (map.get(gram) ?? 0) + 1);
    }
    return map;
  };
  const ga = grams(na);
  const gb = grams(nb);
  let overlap = 0;
  ga.forEach((count, gram) => { overlap += Math.min(count, gb.get(gram) ?? 0); });
  const total = Math.max(1, na.length - 1) + Math.max(1, nb.length - 1);
  return (2 * overlap) / total;
}

/**
 * 对齐新旧两稿：先按内容标识精确对齐（与位置无关），再按高相似度配对正文变化，
 * 然后按同位置同类型兜底，剩下的用较低相似度配成待人工选择的冲突；
 * 新稿独有为新增，旧稿独有为待移除。
 */
function planMerge(oldBlocks: ContentBlock[], newBlocks: ContentBlock[]): { plan: MergePlanItem[]; conflicts: MergeConflict[] } {
  const usedOld = new Set<string>();
  const slots: MergePlanItem[] = newBlocks.map((newBlock) => ({ kind: "added", newBlock }));

  const byKey = new Map<string, ContentBlock[]>();
  for (const oldBlock of oldBlocks) {
    const queue = byKey.get(oldBlock.contentKey) ?? [];
    queue.push(oldBlock);
    byKey.set(oldBlock.contentKey, queue);
  }
  newBlocks.forEach((newBlock, index) => {
    const match = byKey.get(newBlock.contentKey)?.find((oldBlock) => !usedOld.has(oldBlock.id));
    if (match) {
      usedOld.add(match.id);
      slots[index] = { kind: "same", oldBlock: match, newBlock };
    }
  });

  const bestMatch = (newBlock: ContentBlock) => {
    let best: ContentBlock | null = null;
    let bestScore = 0;
    for (const oldBlock of oldBlocks) {
      if (usedOld.has(oldBlock.id)) continue;
      const score = textSimilarity(oldBlock.text, newBlock.text) + (oldBlock.type === newBlock.type ? 0.08 : 0);
      if (score > bestScore) {
        best = oldBlock;
        bestScore = score;
      }
    }
    return { best, bestScore };
  };

  // 高相似度 + 同类型：视为同一段落的正文修改，自动配对。
  newBlocks.forEach((newBlock, index) => {
    if (slots[index].kind !== "added") return;
    const { best, bestScore } = bestMatch(newBlock);
    if (best && best.type === newBlock.type && bestScore >= 0.6) {
      usedOld.add(best.id);
      slots[index] = { kind: "changed", oldBlock: best, newBlock };
    }
  });

  // 同位置同类型：结构未重排时的兜底配对。
  newBlocks.forEach((newBlock, index) => {
    if (slots[index].kind !== "added") return;
    const candidate = oldBlocks[index];
    if (candidate && !usedOld.has(candidate.id) && candidate.type === newBlock.type) {
      usedOld.add(candidate.id);
      slots[index] = { kind: "changed", oldBlock: candidate, newBlock };
    }
  });

  // 其余有一定相似度的配成冲突，交给编辑选择。
  const conflicts: MergeConflict[] = [];
  newBlocks.forEach((newBlock, index) => {
    if (slots[index].kind !== "added") return;
    const { best, bestScore } = bestMatch(newBlock);
    if (best && bestScore > 0.34) {
      usedOld.add(best.id);
      const conflict: MergeConflict = {
        id: uid("conflict"),
        oldBlock: best,
        newBlock,
        note: best.type !== newBlock.type
          ? `类型对不上：旧稿是「${best.type}」，新稿是「${newBlock.type}」`
          : "位置对不上：内容相近但顺序或上下文已变化",
      };
      conflicts.push(conflict);
      slots[index] = { kind: "conflict", oldBlock: best, newBlock, conflictId: conflict.id };
    }
  });

  const removed: MergePlanItem[] = oldBlocks
    .filter((oldBlock) => !usedOld.has(oldBlock.id))
    .map((oldBlock) => ({ kind: "removed", oldBlock }));
  return { plan: [...slots, ...removed], conflicts };
}

function analyze(project: ChapterProject): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  let lastHeading = 0;
  for (const block of project.blocks) {
    if (block.type === "heading") {
      const level = block.headingLevel ?? 2;
      if (lastHeading && level > lastHeading + 1) {
        issues.push({
          id: `heading-${block.id}`,
          blockId: block.id,
          type: "heading",
          severity: "error",
          title: "标题层级跳跃",
          detail: `从 H${lastHeading} 直接到 H${level}，读屏用户会失去清晰的章节结构。`,
          suggestion: `改为 H${lastHeading + 1}，或补上中间的上级标题。`,
        });
      }
      lastHeading = level;
    }
    if (block.type === "image" && !(block.imageAlt ?? block.accessibleText).trim()) {
      issues.push({
        id: `image-${block.id}`,
        blockId: block.id,
        type: "image",
        severity: "error",
        title: "图片缺少替代文本",
        detail: "视觉用户能看到的图表信息，读屏用户目前无法获得。",
        suggestion: "说明图中主体、变化和结论；纯装饰图片应标记为空替代文本。",
      });
    }
    if (block.type === "link") {
      const label = block.accessibleText || block.text;
      if (/^(点击这里|这里|链接|更多|here|click here|read more)$/i.test(label.trim())) {
        issues.push({
          id: `link-${block.id}`,
          blockId: block.id,
          type: "link",
          severity: "error",
          title: "链接文案缺少目的",
          detail: `“${label}”单独朗读时无法说明会前往哪里。`,
          suggestion: "改成“打开水循环互动实验”等可独立理解的文案。",
        });
      }
    }
    const text = block.type === "image" ? block.text : block.text;
    const sentences = text.split(/(?<=[。！？!?])\s*/).filter(Boolean);
    for (const [index, sentence] of sentences.entries()) {
      if (sentenceLength(sentence) > (/[A-Za-z]/.test(sentence) ? 28 : 42)) {
        issues.push({
          id: `sentence-${block.id}-${index}`,
          blockId: block.id,
          type: "sentence",
          severity: "warning",
          title: "句子过长",
          detail: `该句约 ${sentenceLength(sentence)} ${/[A-Za-z]/.test(sentence) ? "个词" : "个字"}，一次理解的信息较多。`,
          suggestion: "按动作或因果关系拆成 2—3 个短句。",
        });
      }
    }
    const source = `${block.text} ${block.accessibleText}`;
    for (const term of project.glossary) {
      if (source.includes(term.source) && block.accessibleText && !block.accessibleText.includes(term.preferred)) {
        issues.push({
          id: `term-${block.id}-${term.id}`,
          blockId: block.id,
          type: "glossary",
          severity: "info",
          title: `术语“${term.source}”尚未统一`,
          detail: `全书建议表述为“${term.preferred}”。${term.note}`,
          suggestion: `将无障碍文本调整为“${term.preferred}”。`,
        });
      }
    }
  }
  return issues;
}

function simplifyText(input: string, glossary: GlossaryTerm[]) {
  let result = input
    .replaceAll("由于其", "因为")
    .replaceAll("因此", "所以")
    .replaceAll("具有十分重要的意义", "很重要")
    .replaceAll("利用", "使用")
    .replaceAll("共同作用", "一起作用")
    .replaceAll("暂时储存", "暂时存住")
    .replaceAll("所承受的压力", "受到的压力")
    .replace(/([^。！？]{38,}?)[，、]([^。！？]{12,}?[。！？])/g, "$1。$2");
  for (const term of glossary) {
    if (result.includes(term.source)) result = result.replaceAll(term.source, term.preferred);
  }
  result = result
    .split(/(?<=[。！？!?])\s*/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .join("\n");
  return result;
}

function blockRole(block: ContentBlock) {
  if (block.type === "heading") return `H${block.headingLevel ?? 2} 标题`;
  if (block.type === "image") return "图片 / 替代文本";
  if (block.type === "link") return "链接";
  return "正文段落";
}

function statusLabel(status: ReviewStatus) {
  if (status === "approved") return "已通过";
  if (status === "needs-work") return "需修改";
  return "待审核";
}

function severityLabel(severity: Severity) {
  if (severity === "error") return "必须修复";
  if (severity === "warning") return "建议优化";
  return "一致性提醒";
}

function exportHtml(project: ChapterProject) {
  const body = project.blocks.map((block) => {
    if (block.type === "heading") {
      const level = Math.min(6, Math.max(1, block.headingLevel ?? 2));
      return `<h${level}>${escapeHtml(block.accessibleText || block.text)}</h${level}>`;
    }
    if (block.type === "image") {
      return `<figure><img src="${escapeHtml(block.imageSrc ?? "")}" alt="${escapeHtml(block.imageAlt || block.accessibleText)}"><figcaption>${escapeHtml(block.text)}</figcaption></figure>`;
    }
    if (block.type === "link") {
      return `<p><a href="${escapeHtml(block.linkHref ?? "#")}">${escapeHtml(block.accessibleText || block.text)}</a></p>`;
    }
    return `<p>${escapeHtml(block.accessibleText || block.text)}</p>`;
  }).join("\n      ");
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(project.title)} · 无障碍版本</title>
  <style>
    :root { font-family: "Noto Sans SC", sans-serif; font-size: 20px; line-height: 1.85; color: #17231f; background: #fffdf7; }
    body { max-width: 760px; margin: 0 auto; padding: 32px 24px 80px; }
    a { color: #075c9d; text-decoration-thickness: 2px; text-underline-offset: 3px; }
    a:focus-visible, [tabindex]:focus-visible { outline: 4px solid #d08a00; outline-offset: 3px; }
    h1, h2, h3, h4, h5, h6 { line-height: 1.4; margin-top: 1.8em; }
    figure { margin: 2em 0; } img { max-width: 100%; height: auto; } figcaption { font-size: .86em; color: #46554f; }
    .skip { position: absolute; left: -9999px; } .skip:focus { position: static; display: inline-block; padding: .5em; background: #fff; }
  </style>
</head>
<body>
  <a class="skip" href="#main">跳到正文</a>
  <main id="main" tabindex="-1">
      ${body}
  </main>
</body>
</html>`;
}

function download(filename: string, content: string, type = "text/html;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

interface StoredState {
  project: ChapterProject;
  mergeSession: MergeSession | null;
}

function loadStoredState(): StoredState {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "") as {
      schema: number;
      project: ChapterProject;
      mergeSession?: MergeSession | null;
    };
    if (stored.schema >= 1 && stored.schema <= SCHEMA_VERSION && stored.project?.blocks?.length) {
      // 旧稿数据升级：schema 1 的块缺少内容标识与确认标记，由 migrateProject 补齐。
      return { project: migrateProject(stored.project), mergeSession: stored.mergeSession ?? null };
    }
  } catch {
    // Fall back to the bundled sample.
  }
  return { project: migrateProject(createSeedProject()), mergeSession: null };
}

const rootElement = document.querySelector<HTMLDivElement>("#app");
if (!rootElement) throw new Error("Application root was not found");
const app: HTMLDivElement = rootElement;

const storedState = loadStoredState();
let project = storedState.project;
let mergeSession: MergeSession | null = storedState.mergeSession;
let activeBlockId = project.blocks[0]?.id ?? "";
let activeIssueId = "";
let previewMode: "normal" | "assisted" = "normal";
let selectedVersionId = "";
let showGlossary = false;
let showMergePanel = false;
let undoStack: ChapterProject[] = [];
let redoStack: ChapterProject[] = [];
let saveTimer = 0;

const activeBlock = () => project.blocks.find((block) => block.id === activeBlockId) ?? project.blocks[0];
const issues = () => analyze(project);

function persistNow() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ schema: SCHEMA_VERSION, project, mergeSession }));
}

function saveSoon() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(persistNow, 320);
}

function commit(label: string, update: (draft: ChapterProject) => void, renderAfter = true) {
  undoStack = [...undoStack.slice(-49), structuredClone(project)];
  redoStack = [];
  const draft = structuredClone(project);
  update(draft);
  draft.updatedAt = new Date().toISOString();
  project = draft;
  document.documentElement.dataset.lastAction = label;
  saveSoon();
  if (renderAfter) render();
}

function undo() {
  const previous = undoStack.pop();
  if (!previous) return;
  redoStack = [structuredClone(project), ...redoStack].slice(0, 50);
  project = previous;
  if (!project.blocks.some((block) => block.id === activeBlockId)) activeBlockId = project.blocks[0]?.id ?? "";
  saveSoon();
  render();
}

function redo() {
  const next = redoStack.shift();
  if (!next) return;
  undoStack = [...undoStack.slice(-49), structuredClone(project)];
  project = next;
  saveSoon();
  render();
}

function updateActiveBlock(update: (block: ContentBlock, draft: ChapterProject) => void, label = "修改无障碍文本", renderAfter = true) {
  commit(label, (draft) => {
    const block = draft.blocks.find((item) => item.id === activeBlockId);
    if (block) update(block, draft);
  }, renderAfter);
}

/** 术语表变化后，只把正文中出现相关术语的段落退回待复核，返回受影响数量。 */
function markGlossaryAffected(draft: ChapterProject, terms: Array<Pick<GlossaryTerm, "source" | "preferred">>) {
  let affected = 0;
  for (const block of draft.blocks) {
    const haystack = `${block.text} ${block.accessibleText}`;
    const hit = terms.some((term) =>
      (term.source && haystack.includes(term.source)) || (term.preferred && haystack.includes(term.preferred)));
    if (hit && block.reviewStatus !== "pending") {
      block.reviewStatus = "pending";
      affected += 1;
    }
  }
  return affected;
}

function startMergeSession(fileName: string, text: string) {
  const incoming = parseImportedChapter(text);
  const { plan, conflicts } = planMerge(project.blocks, incoming);
  mergeSession = {
    id: uid("merge"),
    fileName,
    startedAt: new Date().toISOString(),
    plan,
    conflicts,
    removedDecisions: {},
  };
  showMergePanel = true;
  persistNow();
  render();
}

/** 由合并计划生成新的块序列：正文变过的块保留批注但退回待复核，且标记为未确认。 */
function buildMergedBlocks(session: MergeSession, previousBlocks: ContentBlock[]): ContentBlock[] {
  const merged: ContentBlock[] = [];
  for (const item of session.plan) {
    if (item.kind === "same" && item.oldBlock) {
      merged.push({ ...item.oldBlock, confirmed: true });
    } else if (item.kind === "changed" && item.oldBlock && item.newBlock) {
      merged.push({
        ...item.oldBlock,
        text: item.newBlock.text,
        headingLevel: item.newBlock.headingLevel ?? item.oldBlock.headingLevel,
        imageSrc: item.newBlock.imageSrc ?? item.oldBlock.imageSrc,
        linkHref: item.newBlock.linkHref ?? item.oldBlock.linkHref,
        contentKey: item.newBlock.contentKey,
        reviewStatus: "pending",
        confirmed: false,
      });
    } else if (item.kind === "added" && item.newBlock) {
      merged.push({ ...item.newBlock, reviewStatus: "pending", confirmed: false });
    } else if (item.kind === "conflict" && item.oldBlock && item.newBlock) {
      const conflict = session.conflicts.find((entry) => entry.id === item.conflictId);
      if (conflict?.resolution === "new") {
        merged.push({
          ...item.newBlock,
          accessibleText: item.oldBlock.accessibleText,
          changeReason: item.oldBlock.changeReason,
          comments: item.oldBlock.comments,
          reviewStatus: "pending",
          confirmed: false,
        });
      } else {
        merged.push({ ...item.oldBlock, confirmed: true });
      }
    }
  }
  for (const item of session.plan) {
    if (item.kind !== "removed" || !item.oldBlock) continue;
    if (session.removedDecisions[item.oldBlock.id] !== "keep") continue;
    const originalIndex = previousBlocks.findIndex((block) => block.id === item.oldBlock?.id);
    merged.splice(Math.min(Math.max(0, originalIndex), merged.length), 0, { ...item.oldBlock, confirmed: true });
  }
  return merged;
}

/** 应用合并：作为一个可撤销步骤写入。 */
function applyMergeSession() {
  const session = mergeSession;
  if (!session || session.conflicts.some((conflict) => !conflict.resolution)) return;
  const previousBlocks = project.blocks;
  commit("合并新修订稿", (draft) => {
    draft.blocks = buildMergedBlocks(session, previousBlocks);
  });
  if (!project.blocks.some((block) => block.id === activeBlockId)) activeBlockId = project.blocks[0]?.id ?? "";
  mergeSession = null;
  showMergePanel = false;
  persistNow();
  render();
}

function discardMergeSession() {
  mergeSession = null;
  showMergePanel = false;
  persistNow();
  render();
}

function render() {
  const list = issues();
  const active = activeBlock();
  const activeIssues = list.filter((issue) => issue.blockId === active.id);
  const approved = project.blocks.filter((block) => block.reviewStatus === "approved").length;
  const version = project.versions.find((item) => item.id === selectedVersionId) ?? project.versions[0];

  app.innerHTML = `
    <div class="app-shell">
      <header class="topbar">
        <div class="brand"><span>无障碍</span><b>1009</b></div>
        <div class="title-block">
          <input id="project-title" aria-label="教材名称" value="${escapeHtml(project.title)}" />
          <div class="meta"><span>${escapeHtml(project.subject)}</span><span>${escapeHtml(project.grade)}</span><span class="save-dot">本地自动保存</span></div>
        </div>
        <div class="top-actions">
          <span class="online-pill">${navigator.onLine ? "在线" : "离线可编辑"}</span>
          <sl-button size="small" variant="default" ${undoStack.length ? "" : "disabled"} data-action="undo">撤销</sl-button>
          <sl-button size="small" variant="default" ${redoStack.length ? "" : "disabled"} data-action="redo">重做</sl-button>
          <sl-button size="small" variant="default" data-action="glossary">术语表</sl-button>
          <sl-button size="small" variant="default" data-action="import-revision">导入新修订稿</sl-button>
          <sl-button size="small" variant="primary" data-action="save-version">保存版本</sl-button>
          <sl-button size="small" variant="success" data-action="export">导出无障碍 HTML</sl-button>
        </div>
      </header>

      <div class="progress-strip">
        <div class="progress-copy"><b>${approved}/${project.blocks.length}</b><span>内容块已审核通过</span></div>
        <div class="progress-bar"><i style="width:${Math.round((approved / Math.max(1, project.blocks.length)) * 100)}%"></i></div>
        <div class="issue-counts">
          <span class="error">${list.filter((issue) => issue.severity === "error").length} 必须修复</span>
          <span class="warning">${list.filter((issue) => issue.severity === "warning").length} 建议优化</span>
          <span class="info">${list.filter((issue) => issue.severity === "info").length} 术语提醒</span>
        </div>
      </div>

      ${mergeSession && !showMergePanel ? `
        <div class="merge-banner">
          <span>新修订稿「${escapeHtml(mergeSession.fileName)}」合并进行中：${mergeSession.conflicts.filter((conflict) => !conflict.resolution).length} 处待选择，关闭页面也不会丢失。</span>
          <sl-button size="small" variant="primary" data-action="open-merge">继续处理</sl-button>
          <sl-button size="small" variant="text" data-action="discard-merge">放弃合并</sl-button>
        </div>` : ""}

      <div class="workspace">
        <aside class="outline-panel">
          <div class="panel-title"><span>章节结构</span><sl-badge>${project.blocks.length} 块</sl-badge></div>
          <div class="block-list">
            ${project.blocks.map((block, index) => {
              const blockIssues = list.filter((issue) => issue.blockId === block.id);
              return `<button class="block-item ${block.id === active.id ? "active" : ""}" data-action="select-block" data-block-id="${block.id}">
                <span class="block-order">${index + 1}</span>
                <span class="block-copy"><b>${block.type === "heading" ? `H${block.headingLevel}` : blockRole(block)}</b><span>${escapeHtml(block.accessibleText || block.text || "（空）")}</span></span>
                <i class="status-${block.reviewStatus}" title="${statusLabel(block.reviewStatus)}"></i>
                ${block.confirmed === false ? `<em class="unconfirmed-tag">未确认</em>` : blockIssues.length ? `<em>${blockIssues.length}</em>` : ""}
              </button>`;
            }).join("")}
          </div>
          <input id="chapter-file" type="file" accept=".txt,.md,.markdown" hidden />
          <input id="revision-file" type="file" accept=".txt,.md,.markdown" hidden />
          <sl-button class="import-button" variant="default" data-action="import">导入章节文本</sl-button>
          <div class="keyboard-note"><b>键盘</b><span><kbd>J</kbd><kbd>K</kbd> 跳转问题</span><span><kbd>E</kbd> 自动改写</span><span><kbd>⌘ Z</kbd> 撤销</span><span><kbd>1</kbd><kbd>2</kbd> 预览模式</span></div>
        </aside>

        <main class="editor-panel">
          <div class="editor-head">
            <div><span class="eyebrow">当前内容块</span><h1>${blockRole(active)}</h1></div>
            <div class="review-actions">
              ${active.confirmed === false ? `<sl-button size="small" variant="primary" data-action="confirm-block">确认采用新修订</sl-button>` : ""}
              <sl-button size="small" variant="${active.reviewStatus === "approved" ? "success" : "default"}" data-action="approve">${active.reviewStatus === "approved" ? "✓ 已通过" : "审核通过"}</sl-button>
              <sl-button size="small" variant="${active.reviewStatus === "needs-work" ? "danger" : "default"}" data-action="needs-work">需修改</sl-button>
            </div>
          </div>

          ${activeIssues.length ? `<div class="active-issues">${activeIssues.map((issue) => `
            <div class="issue-card ${issue.severity}">
              <div><sl-badge variant="${issue.severity === "error" ? "danger" : issue.severity === "warning" ? "warning" : "primary"}">${severityLabel(issue.severity)}</sl-badge><strong>${escapeHtml(issue.title)}</strong></div>
              <p>${escapeHtml(issue.detail)}</p><small>${escapeHtml(issue.suggestion)}</small>
            </div>`).join("")}</div>` : `<div class="issue-clear">✓ 当前内容块没有新的无障碍问题</div>`}

          <section class="edit-card source-card">
            <div class="section-heading"><div><span class="eyebrow">原教材</span><h2>${active.type === "image" ? "图片信息" : active.type === "link" ? "链接信息" : "原文"}</h2></div><sl-badge variant="neutral">${active.type}</sl-badge></div>
            ${renderSourceEditor(active)}
          </section>

          <section class="edit-card rewrite-card">
            <div class="section-heading">
              <div><span class="eyebrow">Accessible rewrite</span><h2>无障碍表达</h2></div>
              <sl-button size="small" variant="primary" outline data-action="generate">生成易读版本</sl-button>
            </div>
            ${renderAccessibleEditor(active)}
            <label class="field-label" for="reason-${active.id}">改写原因（每处改写必须记录）</label>
            <sl-textarea id="reason-${active.id}" data-field="reason" rows="2" value="${escapeHtml(active.changeReason)}" placeholder="例如：拆分长句、替换专业表达、补充链接目的"></sl-textarea>
          </section>

          <section class="edit-card">
            <div class="section-heading"><div><span class="eyebrow">Review discussion</span><h2>批注与回复</h2></div><sl-badge variant="warning">${active.comments.length} 条</sl-badge></div>
            <div class="comment-compose"><sl-textarea id="new-comment" rows="2" placeholder="记录改写依据、审核意见或术语讨论…"></sl-textarea><sl-button size="small" variant="primary" data-action="add-comment">添加批注</sl-button></div>
            <div class="comment-list">
              ${active.comments.length ? active.comments.map((comment) => `
                <article class="comment ${comment.resolved ? "resolved" : ""}">
                  <header><b>${escapeHtml(comment.author)}</b><time>${new Date(comment.createdAt).toLocaleString()}</time></header>
                  <p>${escapeHtml(comment.body)}</p>
                  ${comment.replies.map((reply) => `<div class="reply"><b>${escapeHtml(reply.author)}</b><span>${escapeHtml(reply.body)}</span></div>`).join("")}
                  <div class="reply-row"><sl-input size="small" id="reply-${comment.id}" placeholder="回复…"></sl-input><sl-button size="small" data-action="reply" data-comment-id="${comment.id}">回复</sl-button><sl-button size="small" variant="text" data-action="resolve-comment" data-comment-id="${comment.id}">${comment.resolved ? "重新打开" : "解决"}</sl-button></div>
                </article>`).join("") : `<div class="empty-note">当前内容块还没有批注。</div>`}
            </div>
          </section>
        </main>

        <aside class="review-panel">
          <section class="preview-card">
            <div class="section-heading"><div><span class="eyebrow">Reader preview</span><h2>阅读预览</h2></div><div class="mode-switch"><button class="${previewMode === "normal" ? "active" : ""}" data-action="preview-normal">普通</button><button class="${previewMode === "assisted" ? "active" : ""}" data-action="preview-assisted">辅助</button></div></div>
            <div class="reader-preview mode-${previewMode}">${renderPreview()}</div>
          </section>

          <section class="order-card">
            <div class="section-heading"><div><span class="eyebrow">Screen reader order</span><h2>读屏阅读顺序</h2></div><sl-badge>从上到下</sl-badge></div>
            <ol class="reading-order">
              ${project.blocks.map((block, index) => `<li class="${block.id === active.id ? "active" : ""}"><b>${index + 1}</b><div><strong>${blockRole(block)}</strong><span>${escapeHtml(block.accessibleText || block.text || "（无内容）")}</span></div></li>`).join("")}
            </ol>
          </section>

          <section class="issues-panel">
            <div class="section-heading"><div><span class="eyebrow">All checks</span><h2>全章问题</h2></div><sl-button size="small" variant="default" outline data-action="approve-all">全部通过</sl-button></div>
            <div class="issue-list">
              ${list.length ? list.map((issue) => `<button class="${issue.id === activeIssueId ? "active" : ""} ${issue.severity}" data-action="jump-issue" data-issue-id="${issue.id}" data-block-id="${issue.blockId}"><span>${severityLabel(issue.severity)}</span><b>${escapeHtml(issue.title)}</b><small>段 ${project.blocks.findIndex((block) => block.id === issue.blockId) + 1} · ${escapeHtml(issue.suggestion)}</small></button>`).join("") : `<div class="issue-clear">✓ 全章检查通过</div>`}
            </div>
          </section>

          <section class="version-card">
            <div class="section-heading"><div><span class="eyebrow">Version compare</span><h2>版本比较</h2></div><sl-badge>${project.versions.length} 版</sl-badge></div>
            ${project.versions.length ? `
              <sl-select id="version-select" size="small" value="${version?.id ?? ""}">${project.versions.map((item) => `<sl-option value="${item.id}">${escapeHtml(item.label)} · ${new Date(item.createdAt).toLocaleTimeString()}</sl-option>`).join("")}</sl-select>
              <div class="version-diff">${version ? renderVersionDiff(version, active) : ""}</div>
            ` : `<div class="empty-note">保存版本后，可比较改写前后的无障碍文本。</div>`}
          </section>
        </aside>
      </div>

      <footer class="statusbar"><span>最近操作：${escapeHtml(document.documentElement.dataset.lastAction || "示例章节已载入")}</span><span>${project.blocks.length} 个内容块 · ${list.length} 个待处理问题</span></footer>
    </div>

    <sl-dialog label="全书术语表" ${showGlossary ? "open" : ""} data-dialog="glossary">
      <div class="glossary-editor">
        ${project.glossary.map((term) => `<div class="term-row"><div><b>${escapeHtml(term.source)}</b><sl-input size="small" value="${escapeHtml(term.preferred)}" data-term-id="${term.id}"></sl-input><small>${escapeHtml(term.note)}</small></div><sl-button size="small" variant="danger" outline data-action="remove-term" data-term-id="${term.id}">删除</sl-button></div>`).join("")}
      </div>
      <div class="term-add"><sl-input id="new-term-source" placeholder="原文术语"></sl-input><sl-input id="new-term-preferred" placeholder="统一表达"></sl-input><sl-button variant="primary" data-action="add-term">添加术语</sl-button></div>
      <sl-button slot="footer" variant="primary" data-action="close-glossary">完成</sl-button>
    </sl-dialog>

    ${mergeSession ? renderMergeDialog(mergeSession, showMergePanel) : ""}`;

  wireLiveFields();
}

function renderSourceEditor(block: ContentBlock) {
  if (block.type === "image") {
    return `<div class="image-source"><img src="${escapeHtml(block.imageSrc ?? "")}" alt="" /><div><b>图注</b><p>${escapeHtml(block.text)}</p><b>现有替代文本</b><p>${escapeHtml(block.imageAlt || "（空）")}</p></div></div>
      <sl-input id="source-${block.id}" data-field="source" label="图注" value="${escapeHtml(block.text)}"></sl-input>
      <sl-input id="image-alt-${block.id}" data-field="image-alt" label="替代文本" value="${escapeHtml(block.imageAlt ?? "")}" help-text="描述图片传达的信息，不写“图片”二字。"></sl-input>`;
  }
  if (block.type === "link") {
    return `<sl-input id="source-${block.id}" data-field="source" label="原链接文案" value="${escapeHtml(block.text)}"></sl-input><sl-input id="link-href-${block.id}" data-field="link-href" label="链接地址" value="${escapeHtml(block.linkHref ?? "")}"></sl-input>`;
  }
  if (block.type === "heading") {
    return `<div class="heading-edit"><sl-select id="heading-level-${block.id}" data-field="heading-level" label="标题层级" value="${String(block.headingLevel ?? 2)}"><sl-option value="1">H1</sl-option><sl-option value="2">H2</sl-option><sl-option value="3">H3</sl-option><sl-option value="4">H4</sl-option></sl-select><sl-input id="source-${block.id}" data-field="source" label="标题文本" value="${escapeHtml(block.text)}"></sl-input></div>`;
  }
  return `<sl-textarea id="source-${block.id}" data-field="source" rows="4" value="${escapeHtml(block.text)}"></sl-textarea>`;
}

function renderAccessibleEditor(block: ContentBlock) {
  if (block.type === "image") {
    return `<sl-textarea id="accessible-${block.id}" data-field="accessible" rows="3" label="图片替代文本" value="${escapeHtml(block.imageAlt || block.accessibleText)}" help-text="读屏软件会朗读这里的内容。"></sl-textarea>`;
  }
  return `<sl-textarea id="accessible-${block.id}" data-field="accessible" rows="6" value="${escapeHtml(block.accessibleText)}"></sl-textarea>`;
}

function renderPreview() {
  return project.blocks.map((block, index) => {
    const content = escapeHtml(block.accessibleText || block.text);
    if (block.type === "heading") {
      const tag = `h${Math.min(6, Math.max(1, block.headingLevel ?? 2))}`;
      return `<${tag} class="${block.id === activeBlockId ? "active-block" : ""}"><span class="order-marker">${index + 1}</span>${content}</${tag}>`;
    }
    if (block.type === "image") {
      return `<figure class="${block.id === activeBlockId ? "active-block" : ""}"><img src="${escapeHtml(block.imageSrc ?? "")}" alt="${escapeHtml(block.imageAlt || block.accessibleText)}"><figcaption><span class="order-marker">${index + 1}</span>${escapeHtml(block.text)}</figcaption></figure>`;
    }
    if (block.type === "link") {
      return `<p class="${block.id === activeBlockId ? "active-block" : ""}"><span class="order-marker">${index + 1}</span><a href="${escapeHtml(block.linkHref ?? "#")}" onclick="return false">${content}</a><span class="link-role">链接</span></p>`;
    }
    return `<p class="${block.id === activeBlockId ? "active-block" : ""}"><span class="order-marker">${index + 1}</span>${content}</p>`;
  }).join("");
}

function renderVersionDiff(version: VersionSnapshot, current: ContentBlock) {
  const oldBlock = version.blocks.find((block) => block.id === current.id);
  if (!oldBlock) return `<div class="empty-note">当前内容块不在该版本中。</div>`;
  return `<div class="diff-column"><span>旧版</span><p>${escapeHtml(oldBlock.accessibleText || oldBlock.text)}</p></div><div class="diff-column current"><span>当前</span><p>${escapeHtml(current.accessibleText || current.text)}</p></div>`;
}

function mergeBlockSummary(block: ContentBlock) {
  const role = block.type === "heading" ? `H${block.headingLevel ?? 2}` : blockRole(block);
  return `<b>${role}</b><span>${escapeHtml(block.text || "（空）")}</span>`;
}

function renderMergeDialog(session: MergeSession, open: boolean) {
  const sameCount = session.plan.filter((item) => item.kind === "same").length;
  const changed = session.plan.filter((item) => item.kind === "changed");
  const added = session.plan.filter((item) => item.kind === "added");
  const removed = session.plan.filter((item) => item.kind === "removed");
  const unresolved = session.conflicts.filter((conflict) => !conflict.resolution).length;
  return `
    <sl-dialog label="合并新修订稿" ${open ? "open" : ""} class="merge-dialog" data-dialog="merge">
      <p class="merge-intro">来自「${escapeHtml(session.fileName)}」的新稿已按内容标识与旧稿对齐。正文变过的块会保留批注但退回待复核；位置或类型对不上的块需要逐条选择。所有选择会自动保存，关闭页面后可继续。</p>
      <div class="merge-summary">
        <span>✓ 内容一致 ${sameCount}</span>
        <span>✎ 正文有变化 ${changed.length}</span>
        <span>＋ 新稿新增 ${added.length}</span>
        <span>－ 旧稿独有 ${removed.length}</span>
        <span class="${unresolved ? "pending" : "done"}">${unresolved ? `？ 待选择 ${unresolved}` : "✓ 冲突均已选择"}</span>
      </div>

      ${changed.length ? `<section class="merge-group"><h3>正文有变化 · 保留批注并退回待复核</h3>${changed.map((item) => `
        <div class="merge-row"><div class="merge-side">${mergeBlockSummary(item.oldBlock!)}</div><div class="merge-arrow">→</div><div class="merge-side new">${mergeBlockSummary(item.newBlock!)}</div></div>`).join("")}</section>` : ""}

      ${session.conflicts.length ? `<section class="merge-group"><h3>位置或类型对不上 · 请选择保留哪一边</h3>${session.conflicts.map((conflict) => `
        <div class="merge-conflict ${conflict.resolution ? "resolved" : ""}">
          <small>${escapeHtml(conflict.note)}</small>
          <div class="merge-row">
            <button class="merge-side pick ${conflict.resolution === "old" ? "chosen" : ""}" data-action="resolve-conflict" data-conflict-id="${conflict.id}" data-choice="old">
              <b>保留旧稿</b>${mergeBlockSummary(conflict.oldBlock)}${conflict.oldBlock.comments.length ? `<i>${conflict.oldBlock.comments.length} 条批注随之保留</i>` : ""}
            </button>
            <button class="merge-side pick ${conflict.resolution === "new" ? "chosen" : ""}" data-action="resolve-conflict" data-conflict-id="${conflict.id}" data-choice="new">
              <b>采用新稿</b>${mergeBlockSummary(conflict.newBlock)}<i>旧稿批注与改写会转移过来，状态退回待复核</i>
            </button>
          </div>
        </div>`).join("")}</section>` : ""}

      ${added.length ? `<section class="merge-group"><h3>新稿新增 · 导入后需确认才会导出</h3>${added.map((item) => `
        <div class="merge-row single"><div class="merge-side new">${mergeBlockSummary(item.newBlock!)}</div></div>`).join("")}</section>` : ""}

      ${removed.length ? `<section class="merge-group"><h3>旧稿独有 · 新稿中已没有</h3>${removed.map((item) => {
        const decision = session.removedDecisions[item.oldBlock!.id] ?? "drop";
        return `<div class="merge-row"><div class="merge-side ${decision === "keep" ? "" : "dimmed"}">${mergeBlockSummary(item.oldBlock!)}${item.oldBlock!.comments.length ? `<i>${item.oldBlock!.comments.length} 条批注</i>` : ""}</div>
          <sl-button size="small" variant="${decision === "keep" ? "primary" : "default"}" outline data-action="toggle-removed" data-block-id="${item.oldBlock!.id}">${decision === "keep" ? "✓ 保留此块" : "保留此块"}</sl-button></div>`;
      }).join("")}</section>` : ""}

      <div slot="footer" class="merge-footer">
        <sl-button variant="text" data-action="discard-merge">放弃合并</sl-button>
        <sl-button variant="default" data-action="close-merge">稍后继续</sl-button>
        <sl-button variant="primary" data-action="apply-merge" ${unresolved ? "disabled" : ""}>${unresolved ? `还有 ${unresolved} 处待选择` : "应用合并（可撤销）"}</sl-button>
      </div>
    </sl-dialog>`;
}

function wireLiveFields() {
  app.querySelectorAll<HTMLElement>("sl-input[data-field], sl-textarea[data-field], sl-select[data-field]").forEach((element) => {
    element.addEventListener("sl-input", () => {
      const value = (element as HTMLElement & { value: string }).value;
      updateActiveBlock((block) => {
        const field = element.dataset.field;
        if (field === "source") block.text = value;
        if (field === "accessible") {
          block.accessibleText = value;
          if (block.type === "image") block.imageAlt = value;
        }
        if (field === "image-alt") {
          block.imageAlt = value;
          block.accessibleText = value;
        }
        if (field === "link-href") block.linkHref = value;
        if (field === "reason") block.changeReason = value;
        block.reviewStatus = "pending";
      }, "编辑无障碍文本", false);
    });
    element.addEventListener("sl-change", () => render());
  });
}

app.addEventListener("click", (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  if (action === "undo") undo();
  if (action === "redo") redo();
  if (action === "select-block") {
    activeBlockId = target.dataset.blockId ?? activeBlockId;
    activeIssueId = "";
    render();
  }
  if (action === "jump-issue") {
    activeIssueId = target.dataset.issueId ?? "";
    activeBlockId = target.dataset.blockId ?? activeBlockId;
    render();
    requestAnimationFrame(() => app.querySelector<HTMLElement>(".editor-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
  if (action === "generate") {
    const block = activeBlock();
    const suggestion = block.type === "link"
      ? "打开水循环互动实验"
      : simplifyText(block.type === "image" ? block.imageAlt || block.text : block.text, project.glossary);
    updateActiveBlock((current) => {
      if (current.type === "image") current.imageAlt = suggestion;
      current.accessibleText = suggestion;
      current.changeReason ||= "拆分长句并替换复杂表达，保留原有知识信息。";
      current.reviewStatus = "pending";
    }, "生成易读版本");
  }
  if (action === "approve") updateActiveBlock((block) => { block.reviewStatus = "approved"; block.confirmed = true; }, "审核通过");
  if (action === "needs-work") updateActiveBlock((block) => { block.reviewStatus = "needs-work"; }, "标记需修改");
  if (action === "add-comment") {
    const input = app.querySelector<HTMLElement & { value: string }>("#new-comment");
    const body = input?.value.trim();
    if (body) updateActiveBlock((block) => {
      block.comments.unshift({ id: uid("comment"), author: "当前编辑", body, createdAt: new Date().toISOString(), resolved: false, replies: [] });
    }, "添加批注");
  }
  if (action === "reply") {
    const commentId = target.dataset.commentId ?? "";
    const input = app.querySelector<HTMLElement & { value: string }>(`#reply-${CSS.escape(commentId)}`);
    const body = input?.value.trim();
    if (body) updateActiveBlock((block) => {
      block.comments.find((comment) => comment.id === commentId)?.replies.push({ id: uid("reply"), author: "当前编辑", body, createdAt: new Date().toISOString() });
    }, "回复批注");
  }
  if (action === "resolve-comment") {
    const commentId = target.dataset.commentId ?? "";
    updateActiveBlock((block) => {
      const comment = block.comments.find((item) => item.id === commentId);
      if (comment) comment.resolved = !comment.resolved;
    }, "更新批注状态");
  }
  if (action === "preview-normal") { previewMode = "normal"; render(); }
  if (action === "preview-assisted") { previewMode = "assisted"; render(); }
  if (action === "glossary") { showGlossary = true; render(); }
  if (action === "close-glossary") { showGlossary = false; render(); }
  if (action === "add-term") {
    const source = app.querySelector<HTMLElement & { value: string }>("#new-term-source");
    const preferred = app.querySelector<HTMLElement & { value: string }>("#new-term-preferred");
    if (source?.value.trim() && preferred?.value.trim()) {
      const term = { id: uid("term"), source: source.value.trim(), preferred: preferred.value.trim(), note: "编辑新增术语" };
      let affected = 0;
      commit("添加术语", (draft) => {
        draft.glossary.push(term);
        affected = markGlossaryAffected(draft, [term]);
      });
      document.documentElement.dataset.lastAction = affected ? `添加术语，${affected} 个相关段落退回待复核` : "添加术语";
      render();
    }
  }
  if (action === "remove-term") {
    const termId = target.dataset.termId;
    const removedTerm = project.glossary.find((term) => term.id === termId);
    let affected = 0;
    commit("删除术语", (draft) => {
      draft.glossary = draft.glossary.filter((term) => term.id !== termId);
      if (removedTerm) affected = markGlossaryAffected(draft, [removedTerm]);
    });
    document.documentElement.dataset.lastAction = affected ? `删除术语，${affected} 个相关段落退回待复核` : "删除术语";
    render();
  }
  if (action === "save-version") {
    const versionId = uid("version");
    commit("保存版本快照", (draft) => {
      draft.versions.unshift({ id: versionId, label: `版本 ${draft.versions.length + 1}`, createdAt: new Date().toISOString(), blocks: structuredClone(draft.blocks), glossary: structuredClone(draft.glossary) });
      draft.versions = draft.versions.slice(0, 10);
    });
    selectedVersionId = versionId;
    render();
  }
  if (action === "approve-all") {
    commit("全部审核通过", (draft) => { draft.blocks.forEach((block) => { block.reviewStatus = "approved"; block.confirmed = true; }); });
  }
  if (action === "export") {
    const confirmedBlocks = project.blocks.filter((block) => block.confirmed !== false);
    const skipped = project.blocks.length - confirmedBlocks.length;
    if (!confirmedBlocks.length) {
      document.documentElement.dataset.lastAction = "没有已确认的内容，无法导出";
    } else {
      download(`${project.title}-无障碍版.html`, exportHtml({ ...project, blocks: confirmedBlocks }));
      document.documentElement.dataset.lastAction = skipped
        ? `已导出无障碍 HTML（仅含已确认内容，跳过 ${skipped} 个未确认块）`
        : "已导出无障碍 HTML";
    }
    render();
  }
  if (action === "import") app.querySelector<HTMLInputElement>("#chapter-file")?.click();
  if (action === "import-revision") app.querySelector<HTMLInputElement>("#revision-file")?.click();
  if (action === "open-merge") { showMergePanel = true; render(); }
  if (action === "close-merge") { showMergePanel = false; persistNow(); render(); }
  if (action === "discard-merge") discardMergeSession();
  if (action === "apply-merge") applyMergeSession();
  if (action === "resolve-conflict" && mergeSession) {
    const conflict = mergeSession.conflicts.find((item) => item.id === target.dataset.conflictId);
    const choice = target.dataset.choice;
    if (conflict && (choice === "old" || choice === "new")) {
      conflict.resolution = choice;
      persistNow();
      render();
    }
  }
  if (action === "toggle-removed" && mergeSession) {
    const blockId = target.dataset.blockId ?? "";
    mergeSession.removedDecisions[blockId] = mergeSession.removedDecisions[blockId] === "keep" ? "drop" : "keep";
    persistNow();
    render();
  }
  if (action === "confirm-block") {
    updateActiveBlock((block) => { block.confirmed = true; }, "确认采用新修订内容");
  }
});

app.addEventListener("sl-change", (event) => {
  const element = event.target as HTMLElement;
  if (element.id === "chapter-file") return;
  if (element.id.startsWith("heading-level-")) {
    const level = Number((element as HTMLElement & { value: string }).value);
    updateActiveBlock((block) => { block.headingLevel = level; block.reviewStatus = "pending"; }, "修改标题层级");
  }
  if (element.id === "version-select") {
    selectedVersionId = (element as HTMLElement & { value: string }).value;
    render();
  }
  if (element.matches("[data-term-id]")) {
    const termId = element.dataset.termId;
    const value = (element as HTMLElement & { value: string }).value;
    const before = project.glossary.find((term) => term.id === termId);
    let affected = 0;
    commit("修改术语表", (draft) => {
      const term = draft.glossary.find((item) => item.id === termId);
      if (term) {
        term.preferred = value;
        affected = markGlossaryAffected(draft, [
          { source: term.source, preferred: value },
          ...(before && before.preferred !== value ? [{ source: before.source, preferred: before.preferred }] : []),
        ]);
      }
    });
    document.documentElement.dataset.lastAction = affected ? `术语变更，${affected} 个相关段落退回待复核` : "修改术语表";
    render();
  }
});

app.addEventListener("change", (event) => {
  const input = event.target as HTMLInputElement;
  if (!input.files?.[0]) return;
  if (input.id === "chapter-file") {
    void input.files[0].text().then((text) => {
      commit("导入章节文本", (draft) => {
        draft.blocks = parseImportedChapter(text).map((block) => ({ ...block, confirmed: true }));
        activeBlockId = draft.blocks[0]?.id ?? "";
        activeIssueId = "";
      });
    });
    input.value = "";
  }
  if (input.id === "revision-file") {
    const file = input.files[0];
    void file.text().then((text) => startMergeSession(file.name, text));
    input.value = "";
  }
});

app.addEventListener("input", (event) => {
  const input = event.target as HTMLInputElement;
  if (input.id === "project-title") {
    project.title = input.value;
    saveSoon();
  }
});

window.addEventListener("online", render);
window.addEventListener("offline", render);
window.addEventListener("beforeunload", persistNow);
app.addEventListener("sl-hide", (event) => {
  const dialog = (event.target as HTMLElement).closest("[data-dialog]");
  if (dialog?.getAttribute("data-dialog") === "merge") {
    showMergePanel = false;
    persistNow();
  }
  if (dialog?.getAttribute("data-dialog") === "glossary") showGlossary = false;
});
window.addEventListener("keydown", (event) => {
  const target = event.target as HTMLElement;
  if (target.matches("input, textarea, sl-input, sl-textarea, [contenteditable='true']")) return;
  const command = event.metaKey || event.ctrlKey;
  if (command && event.key.toLowerCase() === "z") {
    event.preventDefault();
    event.shiftKey ? redo() : undo();
    return;
  }
  if (command && event.key.toLowerCase() === "s") {
    event.preventDefault();
    const versionId = uid("version");
    commit("键盘保存版本", (draft) => { draft.versions.unshift({ id: versionId, label: `版本 ${draft.versions.length + 1}`, createdAt: new Date().toISOString(), blocks: structuredClone(draft.blocks), glossary: structuredClone(draft.glossary) }); });
    selectedVersionId = versionId;
    return;
  }
  if (event.key.toLowerCase() === "j" || event.key.toLowerCase() === "k") {
    const list = issues();
    if (!list.length) return;
    const current = Math.max(0, list.findIndex((issue) => issue.id === activeIssueId));
    const next = (current + (event.key.toLowerCase() === "j" ? 1 : -1) + list.length) % list.length;
    activeIssueId = list[next].id;
    activeBlockId = list[next].blockId;
    render();
  }
  if (event.key.toLowerCase() === "e") {
    const button = app.querySelector<HTMLElement>('[data-action="generate"]');
    button?.click();
  }
  if (event.key === "1") { previewMode = "normal"; render(); }
  if (event.key === "2") { previewMode = "assisted"; render(); }
});

render();
