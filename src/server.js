#!/usr/bin/env node
// Padlet MCP 서버 (stdio). Claude Desktop / Claude Code 등 MCP 클라이언트에서 사용.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getMe, getBoard, boardToMarkdown } from "./padlet.js";

const server = new McpServer({ name: "padlet-mcp", version: "1.0.0" });

const text = (s) => ({ content: [{ type: "text", text: s }] });
const fail = (e) => ({ content: [{ type: "text", text: `오류: ${e.message}` }], isError: true });

server.registerTool(
  "padlet_list_boards",
  {
    title: "내 Padlet 보드 목록",
    description:
      "API 키 소유자가 접근할 수 있는 Padlet 보드 목록을 가져온다. " +
      "query 로 제목 검색(부분 일치, 대소문자 무시)이 가능하고, limit 으로 개수를 제한한다. 최근 수정순.",
    inputSchema: {
      query: z.string().optional().describe("제목에 포함될 검색어"),
      limit: z.number().int().min(1).max(500).optional().describe("최대 개수 (기본 50)"),
    },
  },
  async ({ query, limit }) => {
    try {
      const me = await getMe();
      let boards = me.boards.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
      if (query) {
        const q = query.toLowerCase();
        boards = boards.filter((b) => b.title.toLowerCase().includes(q) || b.description.toLowerCase().includes(q));
      }
      const total = boards.length;
      boards = boards.slice(0, limit ?? 50);
      const lines = [`사용자: ${me.user.name} (@${me.user.username}) · 보드 ${total}개${query ? ` (검색: ${query})` : ""}`, ""];
      for (const b of boards) lines.push(`- ${b.title || "(제목 없음)"} — id: ${b.id} — ${b.url} — 수정 ${b.updatedAt.slice(0, 10)}`);
      if (total > boards.length) lines.push("", `... 외 ${total - boards.length}개 (limit 또는 query 로 좁혀 보세요)`);
      return text(lines.join("\n"));
    } catch (e) {
      return fail(e);
    }
  }
);

server.registerTool(
  "padlet_get_board",
  {
    title: "Padlet 보드 내용 가져오기",
    description:
      "Padlet 보드의 섹션과 게시물(제목, 본문, 작성자, 첨부 URL)을 가져온다. " +
      "board 에는 padlet URL(https://padlet.com/...) 또는 보드 ID 를 넣는다. " +
      "format: markdown(기본, 읽기 좋음) 또는 json(구조화된 데이터).",
    inputSchema: {
      board: z.string().describe("Padlet URL 또는 보드 ID"),
      format: z.enum(["markdown", "json"]).optional().describe("출력 형식 (기본 markdown)"),
    },
  },
  async ({ board, format }) => {
    try {
      const data = await getBoard(board);
      if (format === "json") return text(JSON.stringify(data, null, 2));
      return text(boardToMarkdown(data));
    } catch (e) {
      return fail(e);
    }
  }
);

server.registerTool(
  "padlet_whoami",
  {
    title: "Padlet API 키 확인",
    description: "현재 설정된 PADLET_API_KEY 가 어느 계정의 것인지 확인한다 (연결 테스트용).",
    inputSchema: {},
  },
  async () => {
    try {
      const me = await getMe();
      return text(`연결 성공: ${me.user.name} (@${me.user.username}, ${me.user.email}) · 접근 가능한 보드 ${me.boards.length}개`);
    } catch (e) {
      return fail(e);
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
