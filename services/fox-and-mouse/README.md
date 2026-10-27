# 여우와 쥐 멀티플레이 서버

원본의 Room·Game·AI·shared 규칙을 보존한 Cloudflare Workers + Durable Objects 서버입니다. 방별 Durable Object가 원본의 20 Hz 권위 서버 판정을 실행합니다. 화면과 게임 자산은 이 저장소의 작품 폴더에서 제공합니다.

## 배포

Cloudflare Workers 및 SQLite Durable Objects 사용 권한이 있는 계정에서 실행합니다.

    npm install
    npm run build
    npm run deploy

배포 후 /health의 ok=true와 실제 Socket.IO 클라이언트 2개의 방 생성·입장·시작·스냅샷·재접속을 확인하고 클라이언트의 VITE_SERVER_URL을 해당 HTTPS 주소로 빌드합니다.

원본 Socket.IO 이벤트는 유지하며 JSON/default namespace/WebSocket 전송을 제공합니다. 방 코드를 연결 query.room에 넣고, 새 방·입장·재접속 때 해당 방으로 연결합니다. 현재 클라이언트는 이 전송을 사용합니다.

게임 실행 중에는 20 Hz 시뮬레이션과 heartbeat 타이머로 방 상태를 유지합니다. 서버 재배포·재시작 시 진행 중인 방이 초기화될 수 있는 점은 원본 메모리 기반 Node 서버와 같습니다. 온라인 서버 연결이 필요하며 오프라인 멀티플레이를 제공하지 않습니다.

앱 설치/PWA는 각 작품 폴더에 있으며 API 키·인증정보는 이 서버 코드에 포함하지 않습니다.
