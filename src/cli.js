#!/usr/bin/env node
// MCP 없이도 쓸 수 있는 간단 CLI.
//   padlet-export list [검색어]
//   padlet-export get <URL 또는 ID> [--json] [-o 파일.md]
import { writeFileSync } from "node:fs";
import { getMe, getBoard, boardToMarkdown } from "./padlet.js";

const [cmd, ...rest] = process.argv.slice(2);

function usage() {
  console.error(`사용법:
  padlet-export list [검색어]                     접근 가능한 보드 목록
  padlet-export get <URL|ID> [--json] [-o 파일]    보드 내용을 Markdown(기본) 또는 JSON 으로

환경 변수 PADLET_API_KEY 가 필요합니다.`);
  process.exit(1);
}

try {
  if (cmd === "list") {
    const q = (rest[0] || "").toLowerCase();
    const me = await getMe();
    const boards = me.boards
      .filter((b) => !q || b.title.toLowerCase().includes(q))
      .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
    console.log(`${me.user.name} (@${me.user.username}) · ${boards.length}개`);
    for (const b of boards) console.log(`${b.id}\t${b.updatedAt.slice(0, 10)}\t${b.title}\t${b.url}`);
  } else if (cmd === "get" && rest[0]) {
    const json = rest.includes("--json");
    const oi = rest.indexOf("-o");
    const out = oi >= 0 ? rest[oi + 1] : null;
    const board = await getBoard(rest[0]);
    const body = json ? JSON.stringify(board, null, 2) : boardToMarkdown(board);
    if (out) {
      writeFileSync(out, body, "utf8");
      console.error(`저장: ${out} (게시물 ${board.posts.length}개)`);
    } else {
      process.stdout.write(body + "\n");
    }
  } else {
    usage();
  }
} catch (e) {
  console.error(`오류: ${e.message}`);
  process.exit(1);
}
