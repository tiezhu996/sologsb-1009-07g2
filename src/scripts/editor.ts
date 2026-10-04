import "@shoelace-style/shoelace/dist/shoelace.js";

type BlockType = "heading" | "paragraph" | "image" | "link";
type ReviewStatus = "pending" | "approved" | "needs-work";
type Severity = "error" | "warning" | "info";
type RevisionState = "unchanged" | "changed" | "added";
type MergeAlignmentKind = "exact" | "changed" | "moved" | "type-mismatch" | "new" | "old";

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
  contentKey: string;
  type: BlockType;
  text: string;
  accessibleText: string;
  headingLevel?: number;
  imageSrc?: string;
  imageAlt?: string;
  linkHref?: string;
  changeReason: string;
  reviewStatus: ReviewStatus;
  revisionState: RevisionState;
  recheckReason: string;
  comments: CommentItem[];
}

interface GlossaryTerm {
  id: string;
  source: string;
  preferred: string;
  note: string;
}

interface MergeAlignment {
  id: string;
  kind: MergeAlignmentKind;
  resolved: boolean;
  decision?: "accept" | "split" | "keep-both" | "drop" | "retain";
  oldId?: string;
  incomingId?: string;
  oldIndex?: number;
  incomingIndex?: number;
  similarity: number;
}

interface MergeSession {
  id: string;
  createdAt: string;
  sourceName: string;
  incoming: ContentBlock[];
  alignments: MergeAlignment[];
}

interface StoredState {
  schema: number;
  project: ChapterProject;
  mergeSession: MergeSession | null;
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

interface UndoEntry {
  project: ChapterProject;
  mergeSession: MergeSession | null;
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

const STORAGE_KEY = "sologsb-1009-accessible-textbook-v2";
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

type SeedBlock = Omit<ContentBlock, "contentKey" | "revisionState" | "recheckReason">;

function normalizeIdentity(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[，。！？；：、,.!?;:()（）【】\[\]"'“”‘’—·-]/g, "");
}

function contentKeyFor(type: BlockType, text: string, extra: { headingLevel?: number; imageSrc?: string; linkHref?: string } = {}) {
  const identity = type === "link"
    ? `${extra.linkHref ?? ""}|${normalizeIdentity(text)}`
    : type === "image"
      ? `${normalizeIdentity(text)}|${extra.imageSrc ?? ""}`
      : type === "heading"
        ? `h${extra.headingLevel ?? 2}|${normalizeIdentity(text)}`
        : normalizeIdentity(text);
  let hash = 2166136261;
  for (let index = 0; index < identity.length; index += 1) {
    hash ^= identity.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `ck-${(hash >>> 0).toString(36)}-${identity.length.toString(36)}`;
}

function withBlockDefaults(block: SeedBlock & Partial<Pick<ContentBlock, "contentKey" | "revisionState" | "recheckReason">>): ContentBlock {
  return {
    revisionState: "unchanged",
    recheckReason: "",
    ...block,
    contentKey: block.contentKey ?? contentKeyFor(block.type, block.text, {
      headingLevel: block.headingLevel,
      imageSrc: block.imageSrc,
      linkHref: block.linkHref,
    }),
  };
}

function createSeedProject(): ChapterProject {
  const blocks: SeedBlock[] = [
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
    blocks: blocks.map(withBlockDefaults),
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
  const block: SeedBlock = {
    id: uid("block"),
    type,
    text,
    accessibleText: type === "image" ? extra.imageAlt ?? "" : text,
    changeReason: "",
    reviewStatus: "pending",
    revisionState: "unchanged",
    recheckReason: "",
    comments: [],
    ...extra,
  };
  return withBlockDefaults(block);
}

function blockSourceSignature(block: ContentBlock) {
  return JSON.stringify([
    block.type,
    block.text,
    block.headingLevel ?? null,
    block.type === "image" ? block.imageSrc ?? "" : null,
    block.imageAlt ?? "",
    block.type === "link" ? block.linkHref ?? "" : null,
  ]);
}

function textSimilarity(left: string, right: string) {
  const a = normalizeIdentity(left);
  const b = normalizeIdentity(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return Math.min(a.length, b.length) / Math.max(a.length, b.length);
  const pairsA = new Set(Array.from({ length: Math.max(1, a.length - 1) }, (_, index) => a.slice(index, index + 2)));
  const pairsB = Array.from({ length: Math.max(1, b.length - 1) }, (_, index) => b.slice(index, index + 2));
  const overlap = pairsB.filter((pair) => pairsA.has(pair)).length;
  return (2 * overlap) / (pairsA.size + pairsB.length);
}

function similarityBetween(oldBlock: ContentBlock, incomingBlock: ContentBlock) {
  if (oldBlock.type !== incomingBlock.type) {
    const textScore = textSimilarity(oldBlock.text, incomingBlock.text);
    return textScore > 0.82 ? 0.82 + textScore * 0.08 : 0;
  }
  let score = textSimilarity(oldBlock.text, incomingBlock.text);
  if (oldBlock.type === "image") {
    score = score * 0.55 + textSimilarity(oldBlock.imageAlt ?? "", incomingBlock.imageAlt ?? "") * 0.25 + (oldBlock.imageSrc === incomingBlock.imageSrc ? 0.2 : 0);
  }
  if (oldBlock.type === "link") {
    score = score * 0.65 + (oldBlock.linkHref === incomingBlock.linkHref ? 0.35 : 0);
  }
  if (oldBlock.type === "heading") score = score * 0.82 + (oldBlock.headingLevel === incomingBlock.headingLevel ? 0.18 : 0);
  return score;
}

function createMergeSession(incomingBlocks: ContentBlock[], currentBlocks: ContentBlock[], sourceName: string): MergeSession {
  const incoming = incomingBlocks.map((block) => ({ ...block, id: uid("incoming-block") }));
  const alignments: MergeAlignment[] = [];
  const usedOld = new Set<string>();
  const usedIncoming = new Set<string>();

  // Stable content identifiers have priority, even when the paragraph moved.
  incoming.forEach((newBlock, incomingIndex) => {
    const exactIndex = currentBlocks.findIndex((oldBlock, oldIndex) =>
      !usedOld.has(oldBlock.id)
      && oldBlock.contentKey === newBlock.contentKey
      && oldBlock.type === newBlock.type
      && (oldBlock.type !== "heading" || oldBlock.headingLevel === newBlock.headingLevel));
    if (exactIndex >= 0) {
      const oldBlock = currentBlocks[exactIndex];
      usedOld.add(oldBlock.id);
      usedIncoming.add(newBlock.id);
      const changed = blockSourceSignature(oldBlock) !== blockSourceSignature(newBlock);
      const moved = exactIndex !== incomingIndex;
      alignments.push({
        id: uid("align"),
        kind: changed ? "changed" : moved ? "moved" : "exact",
        resolved: !moved,
        decision: "accept",
        oldId: oldBlock.id,
        incomingId: newBlock.id,
        oldIndex: exactIndex,
        incomingIndex,
        similarity: 1,
      });
    }
  });

  const candidates: { oldIndex: number; incomingIndex: number; score: number }[] = [];
  currentBlocks.forEach((oldBlock, oldIndex) => {
    if (usedOld.has(oldBlock.id)) return;
    incoming.forEach((newBlock, incomingIndex) => {
      if (usedIncoming.has(newBlock.id)) return;
      const score = similarityBetween(oldBlock, newBlock);
      if (score >= 0.52) candidates.push({ oldIndex, incomingIndex, score });
    });
  });
  candidates.sort((a, b) => b.score - a.score || Math.abs(a.oldIndex - a.incomingIndex) - Math.abs(b.oldIndex - b.incomingIndex));
  for (const candidate of candidates) {
    const oldBlock = currentBlocks[candidate.oldIndex];
    const newBlock = incoming[candidate.incomingIndex];
    if (usedOld.has(oldBlock.id) || usedIncoming.has(newBlock.id)) continue;
    usedOld.add(oldBlock.id);
    usedIncoming.add(newBlock.id);
    const moved = candidate.oldIndex !== candidate.incomingIndex;
    const typeMismatch = oldBlock.type !== newBlock.type;
    alignments.push({
      id: uid("align"),
      kind: typeMismatch ? "type-mismatch" : moved ? "moved" : "changed",
      resolved: !moved && !typeMismatch,
      decision: (!moved && !typeMismatch) ? "accept" : undefined,
      oldId: oldBlock.id,
      incomingId: newBlock.id,
      oldIndex: candidate.oldIndex,
      incomingIndex: candidate.incomingIndex,
      similarity: candidate.score,
    });
  }

  currentBlocks.forEach((block, oldIndex) => {
    if (!usedOld.has(block.id)) alignments.push({
      id: uid("align"),
      kind: "old",
      resolved: false,
      oldId: block.id,
      oldIndex,
      similarity: 0,
    });
  });
  incoming.forEach((block, incomingIndex) => {
    if (!usedIncoming.has(block.id)) alignments.push({
      id: uid("align"),
      kind: "new",
      resolved: false,
      incomingId: block.id,
      incomingIndex,
      similarity: 0,
    });
  });

  alignments.sort((a, b) => (a.incomingIndex ?? Number.MAX_SAFE_INTEGER) - (b.incomingIndex ?? Number.MAX_SAFE_INTEGER)
    || (a.oldIndex ?? Number.MAX_SAFE_INTEGER) - (b.oldIndex ?? Number.MAX_SAFE_INTEGER));
  return { id: uid("merge"), createdAt: new Date().toISOString(), sourceName, incoming, alignments };
}

function describeRecheck(kind: MergeAlignmentKind, similarity: number) {
  if (kind === "changed") return `新修订稿正文已变化（相似度 ${Math.round(similarity * 100)}%），批注已保留，请复核改写。`;
  if (kind === "moved") return "新修订稿中段落位置已调整，批注已保留，请确认新位置。";
  if (kind === "type-mismatch") return "新旧内容的类型对不上，批注已保留，请人工确认映射。";
  return "新修订稿新增段落，需要检查并改写。";
}

function applyMergeSession(current: ChapterProject, session: MergeSession): ChapterProject {
  const oldById = new Map(current.blocks.map((block) => [block.id, block]));
  const incomingById = new Map(session.incoming.map((block) => [block.id, block]));
  const blocks: ContentBlock[] = [];
  const workItems = session.alignments
    .filter((alignment) => alignment.resolved && alignment.decision !== "drop" && (alignment.incomingId || alignment.decision === "retain"))
    .map((alignment) => ({
      alignment,
      order: alignment.incomingId ? alignment.incomingIndex ?? Number.MAX_SAFE_INTEGER : (alignment.oldIndex ?? Number.MAX_SAFE_INTEGER) + 0.5,
    }))
    .sort((a, b) => a.order - b.order);

  for (const { alignment } of workItems) {
    const incoming = alignment.incomingId ? incomingById.get(alignment.incomingId) : undefined;
    const old = alignment.oldId ? oldById.get(alignment.oldId) : undefined;

    if (alignment.decision === "retain" && old) {
      blocks.push({ ...structuredClone(old), revisionState: "unchanged", recheckReason: "新修订稿缺少此段，按人工选择保留旧稿。" });
      continue;
    }
    if (!incoming) continue;
    if (!old || alignment.kind === "new") {
      blocks.push({
        ...structuredClone(incoming),
        id: uid("block"),
        revisionState: "added",
        reviewStatus: "pending",
        recheckReason: describeRecheck("new", 0),
        comments: [],
      });
      continue;
    }

    const merged: ContentBlock = {
      ...structuredClone(incoming),
      id: old.id,
      comments: structuredClone(old.comments),
      changeReason: old.changeReason,
      accessibleText: old.accessibleText,
      imageAlt: incoming.type === "image" ? incoming.imageAlt : old.imageAlt,
      linkHref: incoming.type === "link" ? incoming.linkHref : old.linkHref,
      headingLevel: incoming.headingLevel,
      imageSrc: incoming.imageSrc,
    };
    const changed = blockSourceSignature(old) !== blockSourceSignature(incoming);
    merged.revisionState = changed || alignment.kind === "type-mismatch" ? "changed" : "unchanged";
    merged.recheckReason = changed
      ? describeRecheck(alignment.kind === "type-mismatch" ? "type-mismatch" : "changed", alignment.similarity)
      : alignment.kind === "moved"
        ? "新修订稿中段落位置已调整，批注和审核状态已保留。"
        : "";
    merged.reviewStatus = changed || alignment.kind === "type-mismatch" ? "pending" : old.reviewStatus;
    if (!changed && alignment.kind === "moved") merged.recheckReason = "新修订稿中段落位置已调整，批注和审核状态已保留。";
    if (merged.type === "image") merged.accessibleText = merged.imageAlt ?? "";
    blocks.push(merged);
  }

  return { ...current, blocks, updatedAt: new Date().toISOString() };
}

function sentenceLength(text: string) {
  const normalized = text.replace(/\s+/g, "");
  return /[A-Za-z]/.test(text) ? text.trim().split(/\s+/).length : normalized.length;
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

function markGlossaryAffected(draft: ChapterProject, term: Pick<GlossaryTerm, "source" | "preferred">, reason: string) {
  for (const block of draft.blocks) {
    const haystack = `${block.text} ${block.accessibleText} ${block.imageAlt ?? ""}`;
    if ((term.source && haystack.includes(term.source)) || (term.preferred && haystack.includes(term.preferred))) {
      block.reviewStatus = "pending";
      block.recheckReason = reason;
    }
  }
}

function refreshBlockIdentity(block: ContentBlock) {
  block.contentKey = contentKeyFor(block.type, block.text, {
    headingLevel: block.headingLevel,
    imageSrc: block.imageSrc,
    linkHref: block.linkHref,
  });
  block.revisionState = "changed";
  block.recheckReason ||= "正文内容已手动调整，请重新复核。";
}

function revisionLabel(state: RevisionState) {
  if (state === "changed") return "正文变更·待复核";
  if (state === "added") return "新增·待复核";
  return "旧稿一致";
}

function severityLabel(severity: Severity) {
  if (severity === "error") return "必须修复";
  if (severity === "warning") return "建议优化";
  return "一致性提醒";
}

function exportHtml(project: ChapterProject) {
  const confirmedBlocks = project.blocks.filter((block) => block.reviewStatus === "approved");
  const skipped = project.blocks.length - confirmedBlocks.length;
  const body = confirmedBlocks.map((block) => {
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
  return { html: `<!doctype html>
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
</html>`, confirmedCount: confirmedBlocks.length, skipped };
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

function migrateBlock(raw: Partial<ContentBlock> & { id: string; type: BlockType; text?: string }): ContentBlock {
  const block: SeedBlock = {
    id: raw.id,
    type: raw.type,
    text: raw.text ?? "",
    accessibleText: raw.accessibleText ?? (raw.type === "paragraph" || raw.type === "heading" ? raw.text ?? "" : ""),
    headingLevel: raw.headingLevel,
    imageSrc: raw.imageSrc,
    imageAlt: raw.imageAlt ?? "",
    linkHref: raw.linkHref,
    changeReason: raw.changeReason ?? "",
    reviewStatus: raw.reviewStatus === "approved" || raw.reviewStatus === "needs-work" ? raw.reviewStatus : "pending",
    comments: (raw.comments ?? []).map((comment) => ({
      id: comment.id,
      author: comment.author ?? "旧稿编辑",
      body: comment.body ?? "",
      createdAt: comment.createdAt ?? new Date(0).toISOString(),
      resolved: Boolean(comment.resolved),
      replies: (comment.replies ?? []).map((reply) => ({
        id: reply.id,
        author: reply.author ?? "旧稿编辑",
        body: reply.body ?? "",
        createdAt: reply.createdAt ?? new Date(0).toISOString(),
      })),
    })),
  };
  return withBlockDefaults({
    ...block,
    contentKey: raw.contentKey,
    revisionState: raw.revisionState === "changed" || raw.revisionState === "added" ? raw.revisionState : "unchanged",
    recheckReason: raw.recheckReason ?? "",
  });
}

function migrateProject(raw: Partial<ChapterProject>): ChapterProject {
  const seed = createSeedProject();
  return {
    id: raw.id ?? seed.id,
    title: raw.title ?? seed.title,
    subject: raw.subject ?? seed.subject,
    grade: raw.grade ?? seed.grade,
    blocks: (raw.blocks ?? seed.blocks).map((block) => migrateBlock(block as Partial<ContentBlock> & { id: string; type: BlockType })),
    glossary: (raw.glossary ?? []).map((term) => ({
      id: term.id ?? uid("term"),
      source: term.source ?? "",
      preferred: term.preferred ?? term.source ?? "",
      note: term.note ?? "从旧稿数据升级",
    })),
    versions: (raw.versions ?? []).map((version) => ({
      id: version.id ?? uid("version"),
      label: version.label ?? "旧版本",
      createdAt: version.createdAt ?? new Date().toISOString(),
      blocks: (version.blocks ?? []).map((block) => migrateBlock(block as Partial<ContentBlock> & { id: string; type: BlockType })),
      glossary: version.glossary ?? [],
    })),
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  };
}

function loadStoredState(): StoredState {
  const keys = [STORAGE_KEY, "sologsb-1009-accessible-textbook-v1"];
  for (const key of keys) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const stored = JSON.parse(raw) as StoredState | { schema: number; project: ChapterProject };
      if (!stored || typeof stored !== "object" || !("project" in stored)) continue;
      const project = migrateProject(stored.project as Partial<ChapterProject>);
      const mergeSession = "mergeSession" in stored && stored.mergeSession ? stored.mergeSession as MergeSession : null;
      if (mergeSession) {
        mergeSession.incoming = mergeSession.incoming.map((block) => migrateBlock(block as Partial<ContentBlock> & { id: string; type: BlockType }));
      }
      if (project.blocks.length) return { schema: 2, project, mergeSession };
    } catch {
      // Continue to the next known storage version.
    }
  }
  return { schema: 2, project: createSeedProject(), mergeSession: null };
}

const rootElement = document.querySelector<HTMLDivElement>("#app");
if (!rootElement) throw new Error("Application root was not found");
const app: HTMLDivElement = rootElement;

const initialState = loadStoredState();
let project = initialState.project;
let mergeSession = initialState.mergeSession;
let activeBlockId = project.blocks[0]?.id ?? "";
let activeIssueId = "";
let previewMode: "normal" | "assisted" = "normal";
let selectedVersionId = "";
let showGlossary = false;
let showMerge = Boolean(mergeSession);
let undoStack: UndoEntry[] = [];
let redoStack: UndoEntry[] = [];
let saveTimer = 0;
localStorage.setItem(STORAGE_KEY, JSON.stringify({ schema: 2, project, mergeSession }));

const activeBlock = () => project.blocks.find((block) => block.id === activeBlockId) ?? project.blocks[0];
const issues = () => analyze(project);

function saveSoon() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schema: 2, project, mergeSession }));
  }, 320);
}

function commit(label: string, update: (draft: ChapterProject) => void, renderAfter = true) {
  undoStack = [...undoStack.slice(-49), { project: structuredClone(project), mergeSession: structuredClone(mergeSession) }];
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
  redoStack = [{ project: structuredClone(project), mergeSession: structuredClone(mergeSession) }, ...redoStack].slice(0, 50);
  project = previous.project;
  mergeSession = previous.mergeSession;
  showMerge = Boolean(mergeSession);
  if (!project.blocks.some((block) => block.id === activeBlockId)) activeBlockId = project.blocks[0]?.id ?? "";
  saveSoon();
  render();
}

function redo() {
  const next = redoStack.shift();
  if (!next) return;
  undoStack = [...undoStack.slice(-49), { project: structuredClone(project), mergeSession: structuredClone(mergeSession) }];
  project = next.project;
  mergeSession = next.mergeSession;
  showMerge = Boolean(mergeSession);
  saveSoon();
  render();
}

function updateActiveBlock(update: (block: ContentBlock, draft: ChapterProject) => void, label = "修改无障碍文本", renderAfter = true) {
  commit(label, (draft) => {
    const block = draft.blocks.find((item) => item.id === activeBlockId);
    if (block) update(block, draft);
  }, renderAfter);
}

function renderMergeDialog(session: MergeSession, unresolvedCount: number) {
  const oldById = new Map(project.blocks.map((block) => [block.id, block]));
  const incomingById = new Map(session.incoming.map((block) => [block.id, block]));
  const automatic = session.alignments.filter((alignment) => alignment.resolved && alignment.kind !== "old");
  const pending = session.alignments.filter((alignment) => !alignment.resolved);
  const renderBlockCard = (block: ContentBlock | undefined, side: "old" | "new", note = "") => {
    if (!block) return `<div class="merge-card missing"><b>${side === "old" ? "旧稿：无" : "新稿：无"}</b><span>${note}</span></div>`;
    return `<div class="merge-card revision-${block.revisionState ?? "unchanged"}">
      <b>${side === "old" ? "旧稿" : "新修订稿"} · ${blockRole(block)}${note ? ` · ${note}` : ""}</b>
      <span>${escapeHtml(block.text || block.imageAlt || block.linkHref || "（空）")}</span>
      <small>${block.comments.length ? `${block.comments.length} 条批注会随旧块保留` : "没有批注"} · ${statusLabel(block.reviewStatus)}</small>
    </div>`;
  };

  return `<sl-dialog class="merge-dialog" label="按内容标识对齐新旧段落" open data-dialog="merge">
    <div class="merge-summary">
      <strong>${automatic.length} 处已自动对齐</strong>
      <span>${pending.filter((item) => item.incomingId).length} 个新段落待确认</span>
      <span>${pending.filter((item) => item.oldId && !item.incomingId).length} 个旧段落待取舍</span>
      <b class="${unresolvedCount ? "pending" : "ready"}">${unresolvedCount ? `还剩 ${unresolvedCount} 处必须选择` : "可以合并"}</b>
    </div>
    <div class="merge-actions-row">
      <sl-button size="small" variant="default" outline data-action="accept-all-suggestions">全部采用建议</sl-button>
      <sl-button size="small" variant="text" data-action="cancel-merge">稍后继续（保留现场）</sl-button>
    </div>
    <div class="merge-pending-list">
      ${pending.map((alignment) => {
        const oldBlock = alignment.oldId ? oldById.get(alignment.oldId) : undefined;
        const incomingBlock = alignment.incomingId ? incomingById.get(alignment.incomingId) : undefined;
        const kindLabel: Record<MergeAlignmentKind, string> = {
          exact: "标识一致",
          changed: "正文变化",
          moved: "位置移动",
          "type-mismatch": "类型不一致",
          new: "新稿新增",
          old: "旧稿未匹配",
        };
        return `<article class="merge-row" data-alignment-id="${alignment.id}">
          <header><sl-badge variant="${alignment.kind === "type-mismatch" ? "danger" : "warning"}">${kindLabel[alignment.kind]}</sl-badge>${alignment.similarity ? `<small>相似度 ${Math.round(alignment.similarity * 100)}%</small>` : ""}</header>
          <div class="merge-pair">${renderBlockCard(oldBlock, "old")}${renderBlockCard(incomingBlock, "new")}</div>
          ${renderMergeChoice(alignment, project.blocks, session.incoming, session)}
        </article>`;
      }).join("") || `<div class="issue-clear">所有位置和类型都已确认，可以应用合并。</div>`}
    </div>
    <details class="merge-automatic">
      <summary>查看 ${automatic.length} 处自动对齐结果</summary>
      ${automatic.map((alignment) => {
        const oldBlock = alignment.oldId ? oldById.get(alignment.oldId) : undefined;
        const incomingBlock = alignment.incomingId ? incomingById.get(alignment.incomingId) : undefined;
        return `<div class="merge-auto-row"><span>${kindLabelFor(alignment.kind)}</span><b>${escapeHtml(oldBlock?.text ?? "")}</b><i>→</i><b>${escapeHtml(incomingBlock?.text ?? "")}</b></div>`;
      }).join("")}
    </details>
    <sl-button slot="footer" variant="default" data-action="cancel-merge">稍后继续</sl-button>
    <sl-button slot="footer" variant="primary" ${unresolvedCount ? "disabled" : ""} data-action="apply-merge">应用合并${unresolvedCount ? `（还差 ${unresolvedCount} 处）` : ""}</sl-button>
  </sl-dialog>`;
}

function kindLabelFor(kind: MergeAlignmentKind) {
  if (kind === "changed") return "正文已变";
  if (kind === "moved") return "位置已变";
  if (kind === "type-mismatch") return "类型不符";
  if (kind === "new") return "新增";
  if (kind === "old") return "旧块";
  return "一致";
}

function renderMergeChoice(alignment: MergeAlignment, oldBlocks: ContentBlock[], _incomingBlocks: ContentBlock[], session?: MergeSession) {
  const referencedOld = new Set((session?.alignments ?? [])
    .filter((item) => item.id !== alignment.id && item.oldId && item.resolved && item.decision !== "split" && item.decision !== "keep-both" && item.decision !== "retain")
    .map((item) => item.oldId as string));
  const mappableOld = oldBlocks.filter((block) => !referencedOld.has(block.id) || block.id === alignment.oldId);
  if (alignment.kind === "old") {
    return `<sl-select size="small" data-merge-field="decision" data-alignment-id="${alignment.id}" value="${alignment.decision ?? ""}">
      <sl-option value="">请选择旧稿未匹配段落的处理方式</sl-option>
      <sl-option value="retain">保留旧稿内容（插入新修订稿）</sl-option>
      <sl-option value="drop">出版社已删除，不保留</sl-option>
    </sl-select>`;
  }
  if (!alignment.oldId) {
    return `<sl-select size="small" data-merge-field="decision" data-alignment-id="${alignment.id}" value="${alignment.decision ?? ""}">
      <sl-option value="">请选择新段落对应关系</sl-option>
      <sl-option value="accept">作为新增段落，无旧批注</sl-option>
      ${mappableOld.map((block) => `<sl-option value="map:${block.id}">对应旧稿：${escapeHtml(block.text.slice(0, 34))}（${blockRole(block)}）</sl-option>`).join("")}
    </sl-select>`;
  }
  return `<sl-select size="small" data-merge-field="decision" data-alignment-id="${alignment.id}" value="${alignment.decision ?? ""}">
    <sl-option value="">请确认这个对应关系</sl-option>
    <sl-option value="accept">确认对应，保留批注并退回复核</sl-option>
    <sl-option value="split">不是同一段，新段落作为新增</sl-option>
    <sl-option value="keep-both">新旧都保留</sl-option>
    ${mappableOld.filter((block) => block.id !== alignment.oldId).map((block) => `<sl-option value="map:${block.id}">改对应旧稿：${escapeHtml(block.text.slice(0, 30))}（${blockRole(block)}）</sl-option>`).join("")}
  </sl-select><small>无法确认时不要应用合并；可关闭页面，稍后自动恢复。</small>`;
}

function render() {
  const list = issues();
  const active = activeBlock();
  const activeIssues = list.filter((issue) => issue.blockId === active.id);
  const approved = project.blocks.filter((block) => block.reviewStatus === "approved").length;
  const version = project.versions.find((item) => item.id === selectedVersionId) ?? project.versions[0];
  const unresolvedMergeCount = mergeSession ? mergeSession.alignments.filter((alignment) => !alignment.resolved).length : 0;

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
          ${mergeSession ? `<sl-button size="small" variant="warning" data-action="resume-merge">继续对齐（${unresolvedMergeCount}）</sl-button>` : ""}
          <sl-button size="small" variant="primary" data-action="save-version">保存版本</sl-button>
          <sl-button size="small" variant="success" data-action="export">导出已确认 HTML（${approved}）</sl-button>
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

      ${mergeSession ? `<div class="merge-banner">
        <b>新修订稿尚未合并：</b><span>${escapeHtml(mergeSession.sourceName)} 中还有 ${unresolvedMergeCount} 处位置或类型需要人工选择；处理进度已保存在本机。</span>
        <sl-button size="small" variant="warning" data-action="resume-merge">继续处理</sl-button>
        <sl-button size="small" variant="text" data-action="discard-merge">放弃导入</sl-button>
      </div>` : ""}

      <div class="workspace">
        <aside class="outline-panel">
          <div class="panel-title"><span>章节结构</span><sl-badge>${project.blocks.length} 块</sl-badge></div>
          <div class="block-list">
            ${project.blocks.map((block, index) => {
              const blockIssues = list.filter((issue) => issue.blockId === block.id);
              return `<button class="block-item revision-${block.revisionState} ${block.id === active.id ? "active" : ""}" data-action="select-block" data-block-id="${block.id}">
                <span class="block-order">${index + 1}</span>
                <span class="block-copy"><b>${block.type === "heading" ? `H${block.headingLevel}` : blockRole(block)} · ${revisionLabel(block.revisionState)}</b><span>${escapeHtml(block.accessibleText || block.text || "（空）")}</span></span>
                <i class="status-${block.reviewStatus}" title="${statusLabel(block.reviewStatus)}"></i>
                ${blockIssues.length ? `<em>${blockIssues.length}</em>` : ""}
              </button>`;
            }).join("")}
          </div>
          <input id="chapter-file" type="file" accept=".txt,.md,.markdown" hidden />
          <sl-button class="import-button" variant="default" data-action="import">导入新修订稿并对齐</sl-button>
          <div class="keyboard-note"><b>键盘</b><span><kbd>J</kbd><kbd>K</kbd> 跳转问题</span><span><kbd>E</kbd> 自动改写</span><span><kbd>⌘ Z</kbd> 撤销</span><span><kbd>1</kbd><kbd>2</kbd> 预览模式</span></div>
        </aside>

        <main class="editor-panel">
          <div class="editor-head">
            <div><span class="eyebrow">当前内容块</span><h1>${blockRole(active)}</h1></div>
            <div class="review-actions">
              <sl-button size="small" variant="${active.reviewStatus === "approved" ? "success" : "default"}" data-action="approve">${active.reviewStatus === "approved" ? "✓ 已通过" : "审核通过"}</sl-button>
              <sl-button size="small" variant="${active.reviewStatus === "needs-work" ? "danger" : "default"}" data-action="needs-work">需修改</sl-button>
            </div>
          </div>

          ${active.recheckReason ? `<div class="recheck-banner ${active.revisionState}"><b>${revisionLabel(active.revisionState)}</b><span>${escapeHtml(active.recheckReason)}</span><sl-button size="small" variant="text" data-action="clear-recheck">知道了</sl-button></div>` : ""}

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

    ${showMerge && mergeSession ? renderMergeDialog(mergeSession, unresolvedMergeCount) : ""}`;

  wireLiveFields();
  wireMergeFields();
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

function wireLiveFields() {
  app.querySelectorAll<HTMLElement>("sl-input[data-field], sl-textarea[data-field], sl-select[data-field]").forEach((element) => {
    element.addEventListener("sl-input", () => {
      const value = (element as HTMLElement & { value: string }).value;
      updateActiveBlock((block) => {
        const field = element.dataset.field;
        if (field === "source") {
          block.text = value;
          refreshBlockIdentity(block);
        }
        if (field === "accessible") {
          block.accessibleText = value;
          if (block.type === "image") block.imageAlt = value;
        }
        if (field === "image-alt") {
          block.imageAlt = value;
          block.accessibleText = value;
        }
        if (field === "link-href") {
          block.linkHref = value;
          refreshBlockIdentity(block);
        }
        if (field === "reason") block.changeReason = value;
        if (field !== "reason") block.reviewStatus = "pending";
      }, "编辑无障碍文本", false);
    });
    element.addEventListener("sl-change", () => render());
  });
}

function persistMergeAndRender(label: string) {
  document.documentElement.dataset.lastAction = label;
  saveSoon();
  render();
}

function updateMergeDecision(alignmentId: string, rawDecision: string) {
  if (!mergeSession) return;
  const session = structuredClone(mergeSession);
  const alignment = session.alignments.find((item) => item.id === alignmentId);
  if (!alignment) return;

  if (rawDecision.startsWith("map:")) {
    // The undo entry is pushed after conflict validation below.
  } else if (rawDecision) {
    undoStack = [...undoStack.slice(-49), { project: structuredClone(project), mergeSession: structuredClone(mergeSession) }];
    redoStack = [];
  }

  if (rawDecision.startsWith("map:")) {
    const targetOldId = rawDecision.slice(4);
    const alreadyUsed = session.alignments.some((item) =>
      item.id !== alignment.id && item.oldId === targetOldId && item.resolved && item.decision !== "split" && item.decision !== "keep-both" && item.decision !== "retain");
    if (alreadyUsed) {
      window.alert("这个旧稿段落已经和另一个新段落对应，请先改那里的选择。");
      render();
      return;
    }
    undoStack = [...undoStack.slice(-49), { project: structuredClone(project), mergeSession: structuredClone(mergeSession) }];
    redoStack = [];
    const previousOldId = alignment.oldId;
    const incomingId = alignment.incomingId;
    const existingReleased = session.alignments.find((item) => item.id !== alignment.id && item.oldId === previousOldId && item.kind === "old" && !item.incomingId);
    const targetOldOnly = session.alignments.findIndex((item) => item.id !== alignment.id && item.oldId === targetOldId && item.kind === "old" && !item.incomingId);
    if (targetOldOnly >= 0) session.alignments.splice(targetOldOnly, 1);
    alignment.oldId = targetOldId;
    alignment.decision = "accept";
    alignment.resolved = true;
    const targetOld = project.blocks.find((block) => block.id === targetOldId);
    if (targetOld) {
      alignment.oldIndex = project.blocks.findIndex((block) => block.id === targetOldId);
      const incoming = incomingId ? session.incoming.find((block) => block.id === incomingId) : undefined;
      alignment.kind = targetOld.type === incoming?.type ? "moved" : "type-mismatch";
      alignment.similarity = incoming ? similarityBetween(targetOld, incoming) : 0;
    }
    if (previousOldId && previousOldId !== targetOldId && incomingId) {
      if (existingReleased) {
        existingReleased.incomingId = undefined;
        existingReleased.kind = "old";
        existingReleased.decision = undefined;
        existingReleased.resolved = false;
        existingReleased.similarity = 0;
      } else {
        session.alignments.push({ id: uid("align"), kind: "old", resolved: false, oldId: previousOldId, oldIndex: project.blocks.findIndex((block) => block.id === previousOldId), similarity: 0 });
      }
    }
  } else if (rawDecision === "split" && alignment.incomingId) {
    const oldId = alignment.oldId;
    alignment.oldId = undefined;
    alignment.oldIndex = undefined;
    alignment.kind = "new";
    alignment.decision = "accept";
    alignment.similarity = 0;
    alignment.resolved = true;
    const releasedOld = session.alignments.find((item) => item.id !== alignment.id && item.oldId === oldId && item.kind === "old" && !item.incomingId);
    if (oldId && !releasedOld) session.alignments.push({ id: uid("align"), kind: "old", resolved: false, oldId, oldIndex: project.blocks.findIndex((block) => block.id === oldId), similarity: 0 });
  } else if (rawDecision === "keep-both" && alignment.oldId && alignment.incomingId) {
    const oldId = alignment.oldId;
    alignment.oldId = undefined;
    alignment.kind = "new";
    alignment.decision = "accept";
    alignment.similarity = 0;
    alignment.resolved = true;
    const releasedForBoth = session.alignments.find((item) => item.id !== alignment.id && item.oldId === oldId && item.kind === "old" && !item.incomingId);
    if (!releasedForBoth) session.alignments.push({ id: uid("align"), kind: "old", resolved: true, decision: "retain", oldId, incomingId: undefined, oldIndex: project.blocks.findIndex((block) => block.id === oldId), similarity: 0 });
    else {
      releasedForBoth.resolved = true;
      releasedForBoth.decision = "retain";
    }
  } else if (rawDecision === "retain" && alignment.oldId) {
    alignment.decision = "retain";
    alignment.resolved = true;
    alignment.kind = "old";
  } else if (rawDecision === "drop") {
    alignment.decision = "drop";
    alignment.resolved = true;
    alignment.kind = "old";
  } else if (rawDecision === "accept") {
    alignment.decision = "accept";
    alignment.resolved = true;
    if (alignment.kind === "new") alignment.oldId = undefined;
  }

  mergeSession = session;
  persistMergeAndRender("确认新旧段落对应关系");
}

function wireMergeFields() {
  app.querySelectorAll<HTMLElement>("[data-merge-field='decision']").forEach((element) => {
    element.addEventListener("sl-change", () => {
      const value = (element as HTMLElement & { value: string }).value;
      const alignmentId = element.dataset.alignmentId ?? "";
      updateMergeDecision(alignmentId, value);
    });
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
  if (action === "approve") updateActiveBlock((block) => { block.reviewStatus = "approved"; block.recheckReason = ""; }, "审核通过");
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
  if (action === "clear-recheck") updateActiveBlock((block) => { block.recheckReason = ""; }, "确认复查提示");
  if (action === "preview-normal") { previewMode = "normal"; render(); }
  if (action === "preview-assisted") { previewMode = "assisted"; render(); }
  if (action === "glossary") { showGlossary = true; render(); }
  if (action === "close-glossary") { showGlossary = false; render(); }
  if (action === "add-term") {
    const source = app.querySelector<HTMLElement & { value: string }>("#new-term-source");
    const preferred = app.querySelector<HTMLElement & { value: string }>("#new-term-preferred");
    if (source?.value.trim() && preferred?.value.trim()) {
      const term = { id: uid("term"), source: source.value.trim(), preferred: preferred.value.trim(), note: "编辑新增术语" };
      commit("添加术语并复查受影响段落", (draft) => {
        draft.glossary.push(term);
        markGlossaryAffected(draft, term, `术语“${term.source}”新增，仅复查相关段落。`);
      });
    }
  }
  if (action === "remove-term") {
    const termId = target.dataset.termId;
    const term = project.glossary.find((item) => item.id === termId);
    commit("删除术语并复查受影响段落", (draft) => {
      draft.glossary = draft.glossary.filter((item) => item.id !== termId);
      if (term) markGlossaryAffected(draft, term, `术语“${term.source}”已删除，请复查相关段落。`);
    });
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
    commit("全部审核通过", (draft) => { draft.blocks.forEach((block) => { block.reviewStatus = "approved"; }); });
  }
  if (action === "export") {
    const result = exportHtml(project);
    if (!result.confirmedCount) {
      window.alert("还没有审核通过的新修订内容；导出文件只包含已确认内容。");
      return;
    }
    download(`${project.title}-已确认无障碍版.html`, result.html);
    document.documentElement.dataset.lastAction = `已导出 ${result.confirmedCount} 个已确认内容块，跳过 ${result.skipped} 个待复核块`;
    render();
  }
  if (action === "resume-merge") { showMerge = true; render(); }
  if (action === "cancel-merge") { showMerge = false; saveSoon(); render(); }
  if (action === "discard-merge") {
    if (window.confirm("放弃后将删除本次新修订稿和已做的对齐选择，旧稿不受影响。")) {
      undoStack = [...undoStack.slice(-49), { project: structuredClone(project), mergeSession: structuredClone(mergeSession) }];
      redoStack = [];
      mergeSession = null;
      showMerge = false;
      document.documentElement.dataset.lastAction = "已放弃新修订稿导入";
      saveSoon();
      render();
    }
  }
  if (action === "accept-all-suggestions" && mergeSession) {
    undoStack = [...undoStack.slice(-49), { project: structuredClone(project), mergeSession: structuredClone(mergeSession) }];
    redoStack = [];
    mergeSession = structuredClone(mergeSession);
    for (const alignment of mergeSession.alignments) {
      if (!alignment.resolved && alignment.incomingId && alignment.oldId && alignment.kind === "changed") {
        alignment.decision = "accept";
        alignment.resolved = true;
      }
    }
    persistMergeAndRender("采用自动对齐建议（新增和未匹配旧段仍需选择）");
  }
  if (action === "apply-merge" && mergeSession) {
    const unresolved = mergeSession.alignments.filter((alignment) => !alignment.resolved).length;
    if (unresolved) return;
    undoStack = [...undoStack.slice(-49), { project: structuredClone(project), mergeSession: structuredClone(mergeSession) }];
    redoStack = [];
    project = applyMergeSession(project, mergeSession);
    mergeSession = null;
    showMerge = false;
    activeBlockId = project.blocks[0]?.id ?? "";
    activeIssueId = "";
    document.documentElement.dataset.lastAction = "合并新修订稿：批注已保留，变更段落退回复核";
    saveSoon();
    render();
  }
  if (action === "import") app.querySelector<HTMLInputElement>("#chapter-file")?.click();
});

app.addEventListener("sl-change", (event) => {
  const element = event.target as HTMLElement;
  if (element.id === "chapter-file") return;
  if (element.id.startsWith("heading-level-")) {
    const level = Number((element as HTMLElement & { value: string }).value);
    updateActiveBlock((block) => { block.headingLevel = level; refreshBlockIdentity(block); block.reviewStatus = "pending"; }, "修改标题层级");
  }
  if (element.id === "version-select") {
    selectedVersionId = (element as HTMLElement & { value: string }).value;
    render();
  }
  if (element.matches("[data-term-id]")) {
    const termId = element.dataset.termId;
    const value = (element as HTMLElement & { value: string }).value;
    const previous = project.glossary.find((item) => item.id === termId);
    if (!previous || previous.preferred === value) return;
    commit("修改术语并复查受影响段落", (draft) => {
      const term = draft.glossary.find((item) => item.id === termId);
      if (term) {
        if (previous) markGlossaryAffected(draft, previous, `术语“${previous.source}”的统一表达已变化，仅复查相关段落。`);
        term.preferred = value;
      }
    });
  }
});

app.addEventListener("change", (event) => {
  const input = event.target as HTMLInputElement;
  if (input.id !== "chapter-file" || !input.files?.[0]) return;
  const file = input.files[0];
  void file.text().then((text) => {
    if (mergeSession && !window.confirm("已有一个新修订稿尚未合并。重新导入会清除当前对齐现场，继续吗？")) return;
    undoStack = [...undoStack.slice(-49), { project: structuredClone(project), mergeSession: structuredClone(mergeSession) }];
    redoStack = [];
    mergeSession = createMergeSession(parseImportedChapter(text), project.blocks, file.name);
    showMerge = true;
    document.documentElement.dataset.lastAction = `已导入 ${file.name}：按内容标识完成预对齐`;
    saveSoon();
    render();
    input.value = "";
  });
});

app.addEventListener("input", (event) => {
  const input = event.target as HTMLInputElement;
  if (input.id === "project-title") {
    project.title = input.value;
    saveSoon();
  }
});

app.addEventListener("sl-request-close", (event) => {
  const dialog = event.target as HTMLElement;
  if (dialog.dataset.dialog === "merge" || dialog.closest('[data-dialog="merge"]')) {
    event.preventDefault();
    showMerge = false;
    render();
  }
  if (dialog.dataset.dialog === "glossary" || dialog.closest('[data-dialog="glossary"]')) {
    event.preventDefault();
    showGlossary = false;
    render();
  }
});

window.addEventListener("online", render);
window.addEventListener("offline", render);
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
