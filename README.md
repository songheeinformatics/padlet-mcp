# padlet-mcp

Padlet 보드의 게시물을 Claude(Desktop / Code)에서 **자동으로 가져오는** MCP 서버입니다.
"이 패들렛 정리해 줘" 하고 링크만 붙이면 Claude가 섹션·게시물·첨부를 읽어 옵니다.

MCP 없이 터미널에서 Markdown 파일로 뽑아 주는 `padlet-export` 명령도 들어 있습니다.

## 준비물

1. **Node.js 18 이상** — <https://nodejs.org> 에서 LTS 설치 (설치 후 터미널에서 `node -v` 확인)
2. **본인 Padlet API 키**
   - Padlet 에서 내가 만든 보드를 연다 → 오른쪽 위 `···` 메뉴 → **Developer** → **Generate**
   - `pdltp_` 로 시작하는 키가 나온다. 이 키는 **본인 계정이 볼 수 있는 모든 보드**에 쓰인다.
   - 키는 비밀번호와 같다. 남에게 주거나 채팅·문서에 붙여 넣지 말 것. 유출되면 같은 화면에서 폐기 후 재발급.

## Claude Desktop 에 연결

1. Claude Desktop → 설정(Settings) → **Developer** → **Edit Config**
   - 파일 위치: Windows `%APPDATA%\Claude\claude_desktop_config.json`, macOS `~/Library/Application Support/Claude/claude_desktop_config.json`
2. 아래를 붙여 넣고 `pdltp_여기에_본인_키` 만 본인 키로 바꾼다.

```json
{
  "mcpServers": {
    "padlet": {
      "command": "npx",
      "args": ["-y", "github:OWNER/padlet-mcp"],
      "env": {
        "PADLET_API_KEY": "pdltp_여기에_본인_키"
      }
    }
  }
}
```

3. Claude Desktop 을 완전히 종료했다가 다시 연다. 채팅창 도구 아이콘에 `padlet` 이 보이면 성공.
4. 테스트: "패들렛 연결 확인해 줘" → `padlet_whoami` 가 본인 이름을 보여 주면 끝.

> `OWNER` 는 이 저장소의 GitHub 계정 이름입니다. 저장소 주소가 `https://github.com/OWNER/padlet-mcp` 이면 그대로 쓰면 됩니다.

## Claude Code 에 연결

```bash
claude mcp add padlet -e PADLET_API_KEY=pdltp_여기에_본인_키 -- npx -y github:OWNER/padlet-mcp
```

## 제공하는 도구

| 도구 | 하는 일 |
|---|---|
| `padlet_whoami` | 키가 어느 계정 것인지 확인 (연결 테스트) |
| `padlet_list_boards` | 접근 가능한 보드 목록. `query` 로 제목 검색, `limit` 으로 개수 제한 |
| `padlet_get_board` | 보드 URL 또는 ID 로 섹션·게시물 전체를 Markdown(기본) 또는 JSON 으로 |

Claude 에게 이렇게 말하면 됩니다.

- "내 패들렛 중 '기말고사' 들어간 거 찾아 줘"
- "https://padlet.com/xxx/yyy 이 패들렛 내용 가져와서 학생별로 정리해 줘"
- "이 보드 게시물을 표로 만들어 줘 (작성자, 제목, 본문)"

## MCP 없이 쓰기 (터미널)

```bash
git clone https://github.com/OWNER/padlet-mcp
cd padlet-mcp
npm install
```

Windows PowerShell:

```powershell
$env:PADLET_API_KEY = "pdltp_여기에_본인_키"
node src/cli.js list 기말고사
node src/cli.js get https://padlet.com/xxx/yyy -o 결과.md
```

macOS / Linux:

```bash
export PADLET_API_KEY="pdltp_여기에_본인_키"
node src/cli.js list 기말고사
node src/cli.js get https://padlet.com/xxx/yyy -o 결과.md
```

## 자주 묻는 것

- **키를 하나 공유하면 안 되나요?** 키는 발급한 사람의 계정 권한 그대로입니다. 공유하면 그 사람의 보드 644개가 전부 남에게 열립니다. 선생님마다 각자 발급하세요.
- **학생 게시물도 나오나요?** 보드 권한이 본인에게 있으면 작성자 이름(닉네임)과 함께 나옵니다. 학생 개인정보가 들어 있으니 결과물 공유 시 주의.
- **Not Acceptable / 401 오류** — 키가 틀렸거나 폐기된 것. 다시 발급.

## 개발

```bash
npm install
PADLET_API_KEY=... npm test   # 실제 API 로 스모크 테스트
```

MIT License
