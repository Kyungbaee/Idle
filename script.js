const STORAGE_KEY = "algo-pet-save";
const AUTH_STORAGE_KEY = "algo-pet-auth";

const CONFIG = (() => {
  const globalConfig = window.ALGO_PET_CONFIG ?? {};
  return {
    githubClientId: globalConfig.githubClientId ?? "",
    authProxyUrl: globalConfig.authProxyUrl ?? "",
    enableDemoLogin:
      typeof globalConfig.enableDemoLogin === "boolean" ? globalConfig.enableDemoLogin : true,
    demoUser:
      globalConfig.demoUser ?? {
        login: "algouser",
        name: "체험 탐험가",
        avatar_url: "https://avatars.githubusercontent.com/u/9919?v=4",
      },
  };
})();

const QUIZ_BANK = [
  {
    question: "빅오 표기법에서 O(N log N) 알고리즘의 대표적인 예는?",
    choices: ["버블 정렬", "퀵 정렬", "계수 정렬", "선형 탐색"],
    answer: 1,
    info: "퀵 정렬과 병합 정렬 등이 평균적으로 O(N log N)의 시간 복잡도를 갖습니다.",
  },
  {
    question: "다익스트라 알고리즘이 사용되는 문제 유형은?",
    choices: ["최대 유량", "최소 스패닝 트리", "최단 거리", "위상 정렬"],
    answer: 2,
    info: "다익스트라는 음의 가중치가 없는 그래프에서 최단 거리를 계산합니다.",
  },
  {
    question: "스택의 연산으로 올바른 것은?",
    choices: ["enqueue", "pop", "peekLast", "shift"],
    answer: 1,
    info: "스택은 LIFO 구조로 push와 pop 연산을 지원합니다.",
  },
  {
    question: "컴퓨터 구조에서 캐시 일관성 문제를 해결하기 위한 프로토콜은?",
    choices: ["TCP/IP", "MESI", "HTTPS", "RSA"],
    answer: 1,
    info: "MESI 프로토콜은 캐시의 Modified, Exclusive, Shared, Invalid 상태를 관리합니다.",
  },
  {
    question: "트라이(Trie) 자료구조의 장점은?",
    choices: ["정렬된 상태 유지", "빠른 최대값 탐색", "문자열 검색 속도 향상", "공간 효율성"],
    answer: 2,
    info: "트라이는 문자열 검색을 O(문자열 길이)로 처리할 수 있습니다.",
  },
];

const DEFAULT_STATE = {
  name: "알고냥",
  level: 1,
  exp: 0,
  expToNext: 120,
  coins: 0,
  food: 5,
  lastFedAt: Date.now(),
  lastFedDate: new Date().toISOString().slice(0, 10),
  streak: 1,
  bestStreak: 1,
  debuffActive: false,
  cleanliness: 90,
  lastCleanupCheck: Date.now(),
  events: [],
};

const elements = {
  appShell: document.querySelector("#game-shell"),
  authScreen: document.querySelector("#auth-screen"),
  authError: document.querySelector("#auth-error"),
  name: document.querySelector("#character-name"),
  level: document.querySelector("#character-level"),
  expBar: document.querySelector("#exp-bar"),
  expLabel: document.querySelector("#exp-label"),
  coins: document.querySelector("#coins"),
  food: document.querySelector("#food-stock"),
  streak: document.querySelector("#feed-streak"),
  userPanel: document.querySelector(".hud__user"),
  userName: document.querySelector("#user-name"),
  userHandle: document.querySelector("#user-handle"),
  userAvatar: document.querySelector("#user-avatar"),
  hungerBar: document.querySelector("#hunger-bar"),
  hungerStatus: document.querySelector("#hunger-status"),
  hungerDetail: document.querySelector("#hunger-detail"),
  cleanlinessBar: document.querySelector("#cleanliness-bar"),
  cleanlinessStatus: document.querySelector("#cleanliness-status"),
  cleanlinessDetail: document.querySelector("#cleanliness-detail"),
  debuffBanner: document.querySelector("#debuff-banner"),
  eventLog: document.querySelector("#event-log"),
  logTemplate: document.querySelector("#log-item-template"),
  quizDialog: document.querySelector("#quiz-dialog"),
  quizQuestion: document.querySelector("#quiz-question"),
  quizChoices: document.querySelector("#quiz-choices"),
  quizFeedback: document.querySelector("#quiz-feedback"),
  quizClose: document.querySelector("#quiz-close"),
  thought: document.querySelector("#thought-bubble"),
  pet: document.querySelector("#pet"),
  shadow: document.querySelector("#pet-shadow"),
  feedSpot: document.querySelector("#feed-spot"),
  cleanSpot: document.querySelector("#clean-spot"),
  playground: document.querySelector(".playground__scene"),
};

const feedButtons = Array.from(document.querySelectorAll("[data-feed]"));
const startQuizButton = document.querySelector("#start-quiz");
const resetButton = document.querySelector("#reset-button");
const loginButton = document.querySelector("#github-login");
const demoButton = document.querySelector("#demo-login");
const logoutButton = document.querySelector("#logout-button");

let state = loadState();
let wanderTimer = null;
let thoughtTimer = null;
let previousPosition = { x: 0, y: 0 };
let lastHungerStage = null;
let lastThoughtMessage = "";
let tickInterval = null;
let gameInitialized = false;
let eventsBound = false;
let authState = loadAuthState();

function deepClone(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return deepClone(DEFAULT_STATE);
    const parsed = JSON.parse(saved);
    return { ...deepClone(DEFAULT_STATE), ...parsed };
  } catch (error) {
    console.error("Failed to load state", error);
    return deepClone(DEFAULT_STATE);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadAuthState() {
  try {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!saved) return null;
    return sanitizeSession(JSON.parse(saved));
  } catch (error) {
    console.error("Failed to load auth session", error);
    return null;
  }
}

function persistAuthState(session) {
  if (!session) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

function sanitizeUser(user) {
  if (!user || typeof user !== "object") return null;
  const login = user.login || user.username || "";
  const name = user.name || user.displayName || "";
  const avatar = user.avatar_url || user.avatarUrl || "";
  const id = user.id ?? null;
  return {
    id,
    login,
    name,
    avatar_url: avatar,
    html_url: user.html_url || user.url || null,
  };
}

function sanitizeSession(session) {
  if (!session || typeof session !== "object") return null;
  const safeUser = sanitizeUser(session.user);
  if (!safeUser) return null;
  return {
    user: safeUser,
    demo: Boolean(session.demo),
    provider: session.provider ?? "github",
    lastLoginAt: Date.now(),
  };
}

function setAuthState(session) {
  const sanitized = sanitizeSession(session);
  authState = sanitized;
  persistAuthState(sanitized);
  return sanitized;
}

function clearOAuthParams() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("code") && !url.searchParams.has("state")) {
    return;
  }
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  window.history.replaceState({}, document.title, url.toString());
}

function setAuthError(message) {
  if (!elements.authError) return;
  elements.authError.textContent = message;
  elements.authError.hidden = !message;
}

function setAuthLoading(isLoading) {
  if (loginButton) {
    loginButton.disabled = isLoading;
  }
  if (demoButton) {
    demoButton.disabled = isLoading;
  }
}

function showAuthScreen() {
  if (elements.authScreen) {
    elements.authScreen.hidden = false;
  }
  if (elements.appShell) {
    elements.appShell.hidden = true;
  }
}

function showGameScreen() {
  if (elements.authScreen) {
    elements.authScreen.hidden = true;
  }
  if (elements.appShell) {
    elements.appShell.hidden = false;
  }
}

function updateUserProfile(user) {
  if (!user) {
    if (elements.userPanel) elements.userPanel.hidden = true;
    if (elements.userName) elements.userName.textContent = "";
    if (elements.userHandle) elements.userHandle.textContent = "";
    if (elements.userAvatar) {
      elements.userAvatar.src = "";
      elements.userAvatar.alt = "";
      elements.userAvatar.hidden = true;
    }
    return;
  }
  if (elements.userPanel) {
    elements.userPanel.hidden = false;
  }
  const login = user.login || user.username || "github";
  const displayName = user.name || user.displayName || login;
  const avatarUrl = user.avatar_url || user.avatarUrl || "https://avatars.githubusercontent.com/u/0?v=4";
  if (elements.userName) {
    elements.userName.textContent = displayName || "GitHub 사용자";
  }
  if (elements.userHandle) {
    elements.userHandle.textContent = login ? `@${login}` : "";
  }
  if (elements.userAvatar) {
    elements.userAvatar.src = avatarUrl;
    elements.userAvatar.alt = `${displayName}(@${login})의 아바타`;
    elements.userAvatar.hidden = false;
  }
}

async function fetchGitHubUser(token) {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });
  if (!response.ok) {
    throw new Error("GitHub 사용자 정보를 불러오지 못했어요.");
  }
  return response.json();
}

async function exchangeCodeForSession(code) {
  if (!CONFIG.authProxyUrl) {
    throw new Error("OAuth 프록시 URL이 설정되지 않았어요.");
  }
  const response = await fetch(CONFIG.authProxyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      code,
      redirectUri: `${window.location.origin}${window.location.pathname}`,
    }),
  });
  if (!response.ok) {
    throw new Error("로그인 과정에서 오류가 발생했어요.");
  }
  const payload = await response.json();
  if (payload.user) {
    return { user: payload.user, token: payload.token ?? null };
  }
  if (payload.access_token) {
    const user = await fetchGitHubUser(payload.access_token);
    return { user, token: payload.access_token };
  }
  throw new Error("응답에 사용자 정보가 포함되어 있지 않아요.");
}

function beginGitHubLogin() {
  setAuthError("");
  if (!CONFIG.githubClientId) {
    setAuthError("깃허브 OAuth Client ID를 설정해주세요.");
    return;
  }
  setAuthLoading(true);
  const redirectUri = `${window.location.origin}${window.location.pathname}`;
  const oauthUrl = new URL("https://github.com/login/oauth/authorize");
  oauthUrl.searchParams.set("client_id", CONFIG.githubClientId);
  oauthUrl.searchParams.set("scope", "read:user user:email");
  oauthUrl.searchParams.set("redirect_uri", redirectUri);
  oauthUrl.searchParams.set("allow_signup", "true");
  window.location.href = oauthUrl.toString();
}

function handleDemoLogin() {
  if (!CONFIG.enableDemoLogin) {
    setAuthError("데모 로그인이 비활성화되어 있어요.");
    return;
  }
  setAuthError("");
  const user = CONFIG.demoUser;
  const session = setAuthState({ user, demo: true, provider: "demo" });
  updateUserProfile(session?.user ?? user);
  showGameScreen();
  startGame();
}

async function completeOAuthFlow(code) {
  try {
    setAuthLoading(true);
    setAuthError("");
    const session = await exchangeCodeForSession(code);
    const persisted = setAuthState({ ...session, provider: session.provider ?? "github" });
    updateUserProfile(persisted?.user ?? session.user);
    clearOAuthParams();
    showGameScreen();
    startGame();
  } catch (error) {
    console.error(error);
    setAuthError(error.message || "로그인에 실패했어요. 다시 시도해주세요.");
    showAuthScreen();
  } finally {
    setAuthLoading(false);
  }
}

function handleLogout() {
  setAuthState(null);
  updateUserProfile(null);
  teardownGame();
  setAuthError("");
  setAuthLoading(false);
  showAuthScreen();
}

function randomId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function addEvent(message) {
  state.events.unshift({ id: randomId(), message, at: Date.now() });
  state.events = state.events.slice(0, 30);
}

function formatRelativeTime(timestamp) {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / (60 * 1000));
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

function getHungerState() {
  const hours = (Date.now() - state.lastFedAt) / (60 * 60 * 1000);
  if (hours < 6) {
    return {
      label: "포만",
      detail: "배부르게 밥을 먹었어요!",
      percent: 100 - (hours / 6) * 40,
      tone: "good",
      debuff: false,
      thought: "행복해! 든든하게 먹었어~",
    };
  }
  if (hours < 12) {
    return {
      label: "허기짐",
      detail: "슬슬 배가 고파져요.",
      percent: 60 - ((hours - 6) / 6) * 40,
      tone: "warn",
      debuff: false,
      thought: "혹시 간식 시간인가요?",
    };
  }
  if (hours < 24) {
    return {
      label: "배고픔",
      detail: "12시간 넘게 굶었어요. 경험치가 절반으로 감소합니다.",
      percent: 20 - ((hours - 12) / 12) * 20,
      tone: "danger",
      debuff: true,
      thought: "배고파요... 밥 주세요...",
    };
  }
  return {
    label: "기진맥진",
    detail: "하루 넘게 굶었어요. 성장 속도가 크게 느려집니다.",
    percent: 5,
    tone: "danger",
    debuff: true,
    thought: "힘이 하나도 없어요...",
  };
}

function getCleanlinessState() {
  const cleanliness = state.cleanliness;
  if (cleanliness >= 80) {
    return {
      label: "깨끗함",
      detail: "집이 반짝반짝 빛나요!",
      percent: cleanliness,
      tone: "good",
    };
  }
  if (cleanliness >= 60) {
    return {
      label: "약간 지저분",
      detail: "먼지가 조금 보이기 시작했어요.",
      percent: cleanliness,
      tone: "warn",
    };
  }
  if (cleanliness >= 40) {
    return {
      label: "먼지 수북",
      detail: "알고냥이 재채기를 시작했어요!",
      percent: cleanliness,
      tone: "danger",
    };
  }
  return {
    label: "혼돈의 카오스",
    detail: "빨리 청소하지 않으면 아픈 일이 생길지도 몰라요!",
    percent: cleanliness,
    tone: "danger",
  };
}

function toneToColor(tone) {
  switch (tone) {
    case "good":
      return "var(--good)";
    case "warn":
      return "var(--warn)";
    case "danger":
      return "var(--danger)";
    default:
      return "var(--accent)";
  }
}

function updateMeters() {
  elements.level.textContent = state.level.toString();
  elements.name.textContent = state.name;
  elements.expLabel.textContent = `${state.exp} / ${state.expToNext}`;
  elements.expBar.style.width = `${Math.min(100, (state.exp / state.expToNext) * 100)}%`;
  elements.coins.textContent = state.coins.toLocaleString();
  elements.food.textContent = state.food.toLocaleString();
  elements.streak.textContent = `${state.streak}일`;

  const hunger = getHungerState();
  elements.hungerBar.style.width = `${Math.max(0, hunger.percent)}%`;
  elements.hungerBar.style.background = toneToColor(hunger.tone);
  elements.hungerStatus.textContent = hunger.label;
  elements.hungerDetail.textContent = hunger.detail;

  const cleanliness = getCleanlinessState();
  elements.cleanlinessBar.style.width = `${Math.max(0, cleanliness.percent)}%`;
  elements.cleanlinessBar.style.background = toneToColor(cleanliness.tone);
  elements.cleanlinessStatus.textContent = cleanliness.label;
  elements.cleanlinessDetail.textContent = cleanliness.detail;

  if (hunger.debuff || state.debuffActive) {
    elements.debuffBanner.textContent = "허기로 인해 경험치 보상이 감소 중";
    elements.debuffBanner.classList.add("is-visible");
  } else {
    elements.debuffBanner.classList.remove("is-visible");
  }

  if (hunger.debuff && !state.debuffActive) {
    addEvent("허기 디버프가 발동했습니다. 경험치가 절반으로 감소합니다.");
    state.debuffActive = true;
  } else if (!hunger.debuff && state.debuffActive) {
    addEvent("허기가 해소되어 디버프가 사라졌어요!");
    state.debuffActive = false;
  }

  if (hunger.thought && lastHungerStage !== hunger.label) {
    showThought(hunger.thought, 3500);
    lastHungerStage = hunger.label;
  }
}

function renderEvents() {
  elements.eventLog.innerHTML = "";
  const template = elements.logTemplate;
  if (!template) return;
  state.events.slice(0, 8).forEach((event) => {
    const clone = template.content.cloneNode(true);
    clone.querySelector(".log-item__title").textContent = event.message;
    clone.querySelector(".log-item__detail").textContent = formatRelativeTime(event.at);
    elements.eventLog.appendChild(clone);
  });
}

function updateUI() {
  updateMeters();
  renderEvents();
  saveState();
}

function gainExperience(amount) {
  let expGain = amount;
  if (state.debuffActive) {
    expGain = Math.floor(expGain / 2);
  }
  state.exp += expGain;
  while (state.exp >= state.expToNext) {
    state.exp -= state.expToNext;
    state.level += 1;
    state.expToNext = Math.floor(state.expToNext * 1.18);
    state.coins += 50;
    showThought(`레벨 업! Lv.${state.level} 달성!`, 4000);
    addEvent(`Lv.${state.level} 달성! 축하해요!`);
  }
}

function feedPet(amount) {
  if (state.food < amount) {
    showThought("먹이가 부족해요. 새로운 먹이를 구해와요!", 3000);
    return;
  }
  state.food -= amount;
  const today = new Date().toISOString().slice(0, 10);
  const previous = state.lastFedDate;
  if (previous !== today) {
    if (previous) {
      const diffDays = Math.round(
        (new Date(today).getTime() - new Date(previous).getTime()) / (24 * 60 * 60 * 1000)
      );
      if (diffDays === 1) {
        state.streak += 1;
      } else {
        state.streak = 1;
      }
      state.bestStreak = Math.max(state.bestStreak, state.streak);
    }
    state.lastFedDate = today;
  }
  state.lastFedAt = Date.now();
  const baseExp = amount * 24;
  gainExperience(baseExp);
  addEvent(`${amount} 만큼 먹이를 주었어요.`);
  showThought("냠냠! 너무 맛있어!", 2500);
  animateToElement(elements.feedSpot);
  triggerBounce();
  updateUI();
}

function triggerBounce() {
  elements.pet.classList.add("pet--excited");
  elements.pet.addEventListener(
    "animationend",
    () => {
      elements.pet.classList.remove("pet--excited");
    },
    { once: true }
  );
}

function animateToElement(target) {
  const stageRect = elements.playground.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const x = targetRect.left - stageRect.left + targetRect.width / 2;
  const y = targetRect.top - stageRect.top + targetRect.height / 2;
  movePet({ x, y });
}

function movePet(position) {
  const stageRect = elements.playground.getBoundingClientRect();
  const petRect = elements.pet.getBoundingClientRect();
  if (stageRect.width === 0 || stageRect.height === 0) {
    return;
  }
  const padding = 80;
  const minX = padding + petRect.width / 2;
  const maxX = stageRect.width - padding - petRect.width / 2;
  const minY = stageRect.height * 0.45;
  const maxY = stageRect.height - padding;

  const targetX = clamp(position.x, minX, maxX);
  const targetY = clamp(position.y, minY, maxY);

  if (targetX < previousPosition.x) {
    elements.pet.classList.add("pet--flipped");
  } else {
    elements.pet.classList.remove("pet--flipped");
  }

  previousPosition = { x: targetX, y: targetY };

  elements.pet.style.left = `${targetX}px`;
  elements.pet.style.top = `${targetY}px`;
  elements.shadow.style.left = `${targetX}px`;
  elements.shadow.style.top = `${Math.min(stageRect.height - 40, targetY + 26)}px`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function scheduleWander() {
  if (wanderTimer) {
    clearTimeout(wanderTimer);
  }
  wanderTimer = window.setTimeout(() => {
    const stageRect = elements.playground.getBoundingClientRect();
    const x = stageRect.width * (0.25 + Math.random() * 0.5);
    const y = stageRect.height * (0.5 + Math.random() * 0.3);
    movePet({ x, y });
    scheduleWander();
  }, 4000 + Math.random() * 3000);
}

function showThought(message, duration = 3000) {
  if (!elements.thought) return;
  lastThoughtMessage = message;
  const petRect = elements.pet.getBoundingClientRect();
  const stageRect = elements.playground.getBoundingClientRect();
  if (stageRect.width > 0 && stageRect.height > 0) {
    const x = petRect.left - stageRect.left + petRect.width / 2;
    const y = petRect.top - stageRect.top;
    elements.thought.style.left = `${x}px`;
    elements.thought.style.top = `${y}px`;
  }
  elements.thought.textContent = message;
  elements.thought.classList.add("is-visible");
  if (thoughtTimer) {
    clearTimeout(thoughtTimer);
  }
  thoughtTimer = window.setTimeout(() => {
    elements.thought.classList.remove("is-visible");
  }, duration);
}

function decayCleanliness() {
  const now = Date.now();
  const diffHours = (now - state.lastCleanupCheck) / (60 * 60 * 1000);
  if (diffHours < 1) return;
  const decay = Math.floor(diffHours * 3);
  if (decay <= 0) return;
  state.cleanliness = clamp(state.cleanliness - decay, 0, 100);
  state.lastCleanupCheck = now;
}

function openQuiz() {
  const quiz = QUIZ_BANK[Math.floor(Math.random() * QUIZ_BANK.length)];
  elements.quizDialog.dataset.answer = String(quiz.answer);
  elements.quizQuestion.textContent = quiz.question;
  elements.quizFeedback.textContent = "";
  elements.quizChoices.innerHTML = "";
  quiz.choices.forEach((choice, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "primary";
    button.textContent = `${index + 1}. ${choice}`;
    button.addEventListener("click", () => handleQuizChoice(index, quiz));
    elements.quizChoices.appendChild(button);
  });
  elements.quizDialog.showModal();
}

function handleQuizChoice(index, quiz) {
  if (index === quiz.answer) {
    elements.quizFeedback.textContent = "정답! 청소가 말끔하게 끝났어요.";
    state.cleanliness = clamp(state.cleanliness + 30, 0, 100);
    state.lastCleanupCheck = Date.now();
    addEvent("컴퓨터 공학 퀴즈를 풀고 청소를 마쳤어요!");
    showThought("깨끗해져서 기분이 좋아요!", 3000);
    animateToElement(elements.cleanSpot);
    updateUI();
    window.setTimeout(() => elements.quizDialog.close(), 1200);
  } else {
    elements.quizFeedback.textContent = `${quiz.choices[index]}? 다시 생각해봐요.`;
  }
}

function resetState() {
  if (!confirm("정말 초기화하시겠어요?")) return;
  state = deepClone(DEFAULT_STATE);
  state.lastFedAt = Date.now();
  state.lastCleanupCheck = Date.now();
  state.events = [];
  addEvent("새로운 모험을 시작합니다!");
  movePetToCenter();
  updateUI();
}

function movePetToCenter() {
  const stageRect = elements.playground.getBoundingClientRect();
  movePet({ x: stageRect.width / 2, y: stageRect.height * 0.62 });
}

function tick() {
  decayCleanliness();
  updateUI();
}

function bindEvents() {
  if (eventsBound) return;
  feedButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const amount = Number(button.dataset.feed);
      feedPet(amount);
    });
  });
  startQuizButton.addEventListener("click", () => {
    if (state.cleanliness >= 80) {
      showThought("지금은 충분히 깨끗해요!", 2500);
      return;
    }
    openQuiz();
  });
  resetButton.addEventListener("click", resetState);
  elements.quizClose.addEventListener("click", () => elements.quizDialog.close());
  elements.feedSpot.addEventListener("click", () => animateToElement(elements.feedSpot));
  elements.cleanSpot.addEventListener("click", () => animateToElement(elements.cleanSpot));
  window.addEventListener("resize", () => {
    window.requestAnimationFrame(() => movePet(previousPosition));
  });
  eventsBound = true;
}

function startGame() {
  bindEvents();
  if (!gameInitialized && state.events.length === 0) {
    addEvent("알고냥이 모험을 시작했어요!");
  }
  gameInitialized = true;
  lastHungerStage = null;
  decayCleanliness();
  updateUI();
  if (tickInterval) {
    clearInterval(tickInterval);
  }
  tickInterval = window.setInterval(tick, 5 * 60 * 1000);
  window.requestAnimationFrame(() => {
    movePetToCenter();
    scheduleWander();
  });
}

function teardownGame() {
  if (wanderTimer) {
    clearTimeout(wanderTimer);
    wanderTimer = null;
  }
  if (thoughtTimer) {
    clearTimeout(thoughtTimer);
    thoughtTimer = null;
  }
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
  lastHungerStage = null;
  if (elements.thought) {
    elements.thought.classList.remove("is-visible");
  }
  gameInitialized = false;
}

function bindAuthEvents() {
  if (loginButton) {
    loginButton.addEventListener("click", beginGitHubLogin);
  }
  if (demoButton) {
    if (!CONFIG.enableDemoLogin) {
      demoButton.style.display = "none";
      demoButton.setAttribute("aria-hidden", "true");
      demoButton.setAttribute("tabindex", "-1");
    } else {
      demoButton.addEventListener("click", handleDemoLogin);
    }
  }
  if (logoutButton) {
    logoutButton.addEventListener("click", handleLogout);
  }
}

async function initializeAuth() {
  bindAuthEvents();
  setAuthError("");
  if (authState && authState.user) {
    updateUserProfile(authState.user);
    showGameScreen();
    startGame();
    return;
  }
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  if (code) {
    await completeOAuthFlow(code);
    return;
  }
  showAuthScreen();
}

initializeAuth();
