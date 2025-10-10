# AlgoPet Idle

웹 기반 알골 키우기 게임의 클라이언트 프로토타입입니다. 깃허브 계정으로 로그인하면 알고냥이의 생활 공간으로 진입해 밥을 주고, 청소하고, 함께 시간을 보낼 수 있습니다.

## 최근 작업 요약

- GitHub OAuth 인증을 처리하는 전용 라우터(`routes/github.js`)를 추가하여 로그인, 콜백, 사용자 정보 조회 엔드포인트를 구성했습니다.
- Express 앱 초기 구동 시 `dotenv`를 통해 GitHub OAuth 클라이언트 설정을 불러오도록 구성했습니다.
- 필수 GitHub OAuth 환경 변수(`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_REDIRECT_URI`)를 `.env.example`에 명시했습니다.

## 주요 기능

- **GitHub 로그인**: 깃허브 OAuth 버튼으로 로그인하면 캐릭터 방으로 입장합니다. 데모 모드 버튼으로는 계정 없이 체험할 수 있습니다.
- **밥 주기**: 보유한 먹이를 사용해 캐릭터에게 밥을 주면 경험치를 획득합니다. 12시간 이상 밥을 주지 않으면 경험치 디버프가 활성화됩니다.
- **인터랙티브 무대**: 알고냥이 중앙 무대에서 자유롭게 돌아다니며 먹이통과 청소 지점으로 이동합니다.
- **성장 시스템**: 경험치를 모아 레벨을 올리고, 레벨업 보상으로 코인을 받습니다. 연속 급식 일수도 추적합니다.
- **환경 청결 관리**: 시간이 지나면 청결도가 감소합니다. 청결도가 낮아지면 CS 퀴즈를 풀어 환경을 청소할 수 있습니다.
- **활동 로그**: 밥 주기, 청결도 회복, 상태 변화 등이 타임라인 형태로 기록됩니다.

## 사용 방법

1. 루트에서 `npm install` 실행 후 `npm --prefix client install`로 프론트엔드 의존성을 설치합니다.
2. 개발 중에는 `npm run dev`로 Vite 개발 서버를 실행하고, Express 백엔드와 연동해 OAuth 콜백을 처리할 수 있습니다.
3. 배포 시 `npm run build`를 실행하면 `client` 프로젝트가 `dist/`로 번들되고 Express가 정적 자산을 제공합니다.
4. `GitHub으로 로그인` 버튼을 누르면 깃허브 OAuth 인증으로 이동하며, 로그인 후 캐릭터 방이 열립니다.
5. `체험 모드로 둘러보기` 버튼으로 계정 없이도 즉시 게임을 둘러볼 수 있습니다(필요 시 비활성화 가능).
6. 모든 게임 데이터는 브라우저 `localStorage`에 저장되며, `초기화` 버튼으로 리셋할 수 있습니다.

### GitHub OAuth 연동 설정

프론트엔드만 포함되어 있으므로 OAuth 토큰 교환을 처리할 서버(또는 서버리스 함수)가 필요합니다.

1. 깃허브 개발자 설정에서 OAuth App을 생성하고 `Homepage URL`과 `Authorization callback URL`에 게임이 배포될 주소를 입력합니다.
2. `index.html`을 불러오기 전에 전역 설정 객체를 정의해 OAuth 정보를 주입합니다.

```html
<script>
  window.ALGO_PET_CONFIG = {
    githubClientId: "YOUR_CLIENT_ID",
    authProxyUrl: "https://your-domain.com/api/github-oauth", // code를 access token이나 세션으로 교환해주는 엔드포인트
    enableDemoLogin: true, // 필요 없으면 false로 변경
  };
</script>
```

3. `authProxyUrl`로 지정한 엔드포인트는 GitHub에서 전달된 `code`를 받아 토큰을 교환하고, `{ user, token }` 또는 `{ user }` JSON을 반환하도록 구현합니다.
4. 서버에서 쿠키 세션을 설정하는 방식이라면 `user` 정보를 JSON으로 반환해 주기만 하면 됩니다. 액세스 토큰을 직접 반환하는 경우 클라이언트는 GitHub API에서 사용자 정보를 조회합니다.

### 데모 모드

- `window.ALGO_PET_CONFIG.enableDemoLogin`을 `false`로 설정하면 데모 로그인 버튼이 숨겨집니다.
- `window.ALGO_PET_CONFIG.demoUser` 속성으로 체험 모드에서 사용할 프로필(이름, 로그인, 아바타 URL)을 지정할 수 있습니다.

## 개발 참고

- Vue 3 + Vite 기반 SPA로 재구성되어 있으며 `client/` 디렉터리에서 개발합니다.
- 디자인에 구글 폰트(Jua, Roboto)를 사용합니다.
- 주요 상태 로직은 `client/src/composables/useGameState.js`와 `useAuth.js`에서 관리합니다.
