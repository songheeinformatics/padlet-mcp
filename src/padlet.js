// Padlet 공개 API(https://api.padlet.dev) 래퍼.
// API 키는 반드시 환경 변수 PADLET_API_KEY 로만 받는다. 코드·파일에 키를 쓰지 않는다.

const BASE_URL = "https://api.padlet.dev/v1";

export function getApiKey() {
  const key = process.env.PADLET_API_KEY;
  if (!key) {
    throw new Error(
      "PADLET_API_KEY 환경 변수가 설정되어 있지 않습니다. " +
        "Padlet 보드의 ··· 메뉴 → Developer 에서 키를 발급받아 설정하세요."
    );
  }
  return key;
}

async function request(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "X-API-KEY": getApiKey(), Accept: "application/vnd.api+json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Padlet API ${res.status} ${res.statusText}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

/** padlet URL 또는 ID 문자열에서 보드 ID를 뽑아낸다. */
export function extractBoardId(input) {
  const s = String(input).trim();
  if (/^[a-z0-9]{10,24}$/i.test(s)) return s;
  try {
    const url = new URL(s);
    const segs = url.pathname.split("/").filter(Boolean);
    const last = segs[segs.length - 1] || "";
    const tail = last.split("-").pop();
    if (tail && /^[a-z0-9]{10,24}$/i.test(tail)) return tail;
  } catch {
    // not a URL
  }
  throw new Error(`보드 ID를 알아낼 수 없습니다: ${input}`);
}

/** 간단한 HTML → 텍스트 변환 (bodyHtml 용). */
export function htmlToText(html) {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** 현재 사용자 정보와 보드 목록. */
export async function getMe() {
  const json = await request("/me?include=boards");
  const u = json.data?.attributes || {};
  const boards = (json.included || [])
    .filter((x) => x.type === "board")
    .map((b) => ({
      id: b.id,
      title: b.attributes?.title || "",
      description: b.attributes?.description || "",
      url: b.attributes?.webUrl?.live || "",
      updatedAt: b.attributes?.updatedAt || "",
      createdAt: b.attributes?.createdAt || "",
    }));
  return {
    user: { name: u.name, username: u.username, email: u.email },
    boards,
  };
}

/** 보드 하나를 섹션·게시물까지 정리된 구조로 가져온다. */
export async function getBoard(idOrUrl) {
  const id = extractBoardId(idOrUrl);
  const json = await request(`/boards/${id}?include=posts,sections`);
  const b = json.data;
  const included = json.included || [];

  const sections = included
    .filter((x) => x.type === "section")
    .map((s) => ({
      id: s.id,
      title: s.attributes?.title || "",
      sortIndex: s.attributes?.sortIndex ?? 0,
    }))
    .sort((a, z) => a.sortIndex - z.sortIndex);

  const posts = included
    .filter((x) => x.type === "post")
    .map((p) => {
      const a = p.attributes || {};
      const c = a.content || {};
      const att = c.attachment || {};
      return {
        id: p.id,
        sectionId: p.relationships?.section?.data?.id || a.sectionId || null,
        author: a.author?.fullName || a.author?.shortName || a.author?.username || "",
        subject: c.subject || "",
        body: htmlToText(c.bodyHtml),
        bodyHtml: c.bodyHtml || "",
        attachmentUrl: att.url || "",
        attachmentCaption: att.caption || "",
        color: a.color || null,
        status: a.status || "",
        sortIndex: a.sortIndex ?? 0,
        updatedAt: c.updatedAt || a.updatedAt || "",
      };
    })
    .sort((a, z) => a.sortIndex - z.sortIndex);

  return {
    id: b.id,
    title: b.attributes?.title || "",
    description: b.attributes?.description || "",
    url: b.attributes?.webUrl?.live || "",
    builder: b.attributes?.builder?.fullName || "",
    createdAt: b.attributes?.createdAt || "",
    updatedAt: b.attributes?.updatedAt || "",
    sections,
    posts,
  };
}

/** 정리된 보드 구조를 Markdown 문서로. */
export function boardToMarkdown(board) {
  const lines = [];
  lines.push(`# ${board.title || "(제목 없음)"}`);
  if (board.description) lines.push("", board.description);
  lines.push("", `- 링크: ${board.url}`, `- 작성자: ${board.builder}`, `- 수정일: ${board.updatedAt}`, `- 게시물 수: ${board.posts.length}`, "");

  const renderPost = (p, i) => {
    const head = p.subject ? `### ${i}. ${p.subject}` : `### ${i}.`;
    lines.push(head);
    const meta = [p.author && `작성자: ${p.author}`, p.updatedAt && `수정: ${p.updatedAt}`].filter(Boolean);
    if (meta.length) lines.push(`_${meta.join(" · ")}_`);
    if (p.body) lines.push("", p.body);
    if (p.attachmentUrl) lines.push("", `첨부: ${p.attachmentUrl}${p.attachmentCaption ? ` (${p.attachmentCaption})` : ""}`);
    lines.push("");
  };

  let n = 0;
  if (board.sections.length) {
    const bySection = new Map(board.sections.map((s) => [s.id, []]));
    const orphans = [];
    for (const p of board.posts) {
      if (p.sectionId && bySection.has(p.sectionId)) bySection.get(p.sectionId).push(p);
      else orphans.push(p);
    }
    for (const s of board.sections) {
      lines.push(`## ${s.title || "(섹션)"}`, "");
      for (const p of bySection.get(s.id)) renderPost(p, ++n);
    }
    if (orphans.length) {
      lines.push(`## (섹션 없음)`, "");
      for (const p of orphans) renderPost(p, ++n);
    }
  } else {
    for (const p of board.posts) renderPost(p, ++n);
  }
  return lines.join("\n");
}
