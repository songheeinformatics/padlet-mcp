// MCP 서버를 실제로 띄워 세 도구를 호출해 보는 스모크 테스트. PADLET_API_KEY 필요.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { extractBoardId, htmlToText } from "../src/padlet.js";
import assert from "node:assert/strict";

// 순수 함수 테스트
assert.equal(extractBoardId("https://padlet.com/sahmyook1/padlet-q6pc6sr3uwcd2cfm"), "q6pc6sr3uwcd2cfm");
assert.equal(extractBoardId("https://padlet.com/user/my-nice-title-abc123def456gh"), "abc123def456gh");
assert.equal(extractBoardId("q6pc6sr3uwcd2cfm"), "q6pc6sr3uwcd2cfm");
assert.equal(htmlToText("<div>안녕<br>하세요</div><p>&amp; 끝</p>"), "안녕\n하세요\n& 끝");
console.log("✓ extractBoardId / htmlToText");

if (!process.env.PADLET_API_KEY) {
  console.log("PADLET_API_KEY 없음: API 테스트는 건너뜀");
  process.exit(0);
}

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["src/server.js"],
  env: { ...process.env },
});
const client = new Client({ name: "smoke", version: "0.0.0" });
await client.connect(transport);

const tools = (await client.listTools()).tools.map((t) => t.name);
assert.deepEqual(tools.sort(), ["padlet_get_board", "padlet_list_boards", "padlet_whoami"]);
console.log("✓ tools:", tools.join(", "));

const who = await client.callTool({ name: "padlet_whoami", arguments: {} });
assert.ok(!who.isError, who.content[0].text);
console.log("✓ whoami:", who.content[0].text);

const list = await client.callTool({ name: "padlet_list_boards", arguments: { limit: 3 } });
assert.ok(!list.isError, list.content[0].text);
console.log("✓ list_boards:\n" + list.content[0].text);

const firstId = /id: ([a-z0-9]+)/.exec(list.content[0].text)?.[1];
assert.ok(firstId, "보드 id 를 목록에서 찾지 못함");
const board = await client.callTool({ name: "padlet_get_board", arguments: { board: firstId } });
assert.ok(!board.isError, board.content[0].text);
console.log("✓ get_board (markdown, 앞 600자):\n" + board.content[0].text.slice(0, 600));

await client.close();
console.log("모든 테스트 통과");
