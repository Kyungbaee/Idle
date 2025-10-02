import { computed, reactive, ref, watch } from 'vue';
import { STORAGE_KEY } from '@/config';
import { QUIZ_BANK } from '@/data/quizBank';

const DEFAULT_STATE = {
  name: '알고냥',
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

function deepClone(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function loadState() {
  if (typeof window === 'undefined') return deepClone(DEFAULT_STATE);
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return deepClone(DEFAULT_STATE);
    const parsed = JSON.parse(saved);
    return { ...deepClone(DEFAULT_STATE), ...parsed };
  } catch (error) {
    console.error('Failed to load state', error);
    return deepClone(DEFAULT_STATE);
  }
}

function persistState(state) {
  if (typeof window === 'undefined') return;
  const snapshot = JSON.parse(JSON.stringify(state));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

function randomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function formatRelativeTime(timestamp) {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / (60 * 1000));
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getHungerState(state) {
  const hours = (Date.now() - state.lastFedAt) / (60 * 60 * 1000);
  if (hours < 6) {
    return {
      label: '포만',
      detail: '배부르게 밥을 먹었어요!',
      percent: 100 - (hours / 6) * 40,
      tone: 'good',
      debuff: false,
      thought: '행복해! 든든하게 먹었어~',
    };
  }
  if (hours < 12) {
    return {
      label: '허기짐',
      detail: '슬슬 배가 고파져요.',
      percent: 60 - ((hours - 6) / 6) * 40,
      tone: 'warn',
      debuff: false,
      thought: '혹시 간식 시간인가요?',
    };
  }
  if (hours < 24) {
    return {
      label: '배고픔',
      detail: '12시간 넘게 굶었어요. 경험치가 절반으로 감소합니다.',
      percent: 20 - ((hours - 12) / 12) * 20,
      tone: 'danger',
      debuff: true,
      thought: '배고파요... 밥 주세요...',
    };
  }
  return {
    label: '기진맥진',
    detail: '하루 넘게 굶었어요. 성장 속도가 크게 느려집니다.',
    percent: 5,
    tone: 'danger',
    debuff: true,
    thought: '힘이 하나도 없어요...',
  };
}

function getCleanlinessState(state) {
  const cleanliness = state.cleanliness;
  if (cleanliness >= 80) {
    return {
      label: '깨끗함',
      detail: '집이 반짝반짝 빛나요!',
      percent: cleanliness,
      tone: 'good',
    };
  }
  if (cleanliness >= 60) {
    return {
      label: '약간 지저분',
      detail: '먼지가 조금 보이기 시작했어요.',
      percent: cleanliness,
      tone: 'warn',
    };
  }
  if (cleanliness >= 40) {
    return {
      label: '먼지 수북',
      detail: '알고냥이 재채기를 시작했어요!',
      percent: cleanliness,
      tone: 'danger',
    };
  }
  return {
    label: '혼돈의 카오스',
    detail: '빨리 청소하지 않으면 아픈 일이 생길지도 몰라요!',
    percent: cleanliness,
    tone: 'danger',
  };
}

function decayCleanliness(state) {
  const now = Date.now();
  const diffHours = (now - state.lastCleanupCheck) / (60 * 60 * 1000);
  if (diffHours < 1) return;
  const decay = Math.floor(diffHours * 3);
  if (decay <= 0) return;
  state.cleanliness = clamp(state.cleanliness - decay, 0, 100);
  state.lastCleanupCheck = now;
}

function gainExperience(state, amount, isDebuffed) {
  let expGain = amount;
  if (isDebuffed) {
    expGain = Math.floor(expGain / 2);
  }
  state.exp += expGain;
  while (state.exp >= state.expToNext) {
    state.exp -= state.expToNext;
    state.level += 1;
    state.expToNext = Math.floor(state.expToNext * 1.18);
    state.coins += 50;
    addEvent(state, `Lv.${state.level} 달성! 축하해요!`);
  }
}

function addEvent(state, message) {
  state.events.unshift({ id: randomId(), message, at: Date.now() });
  state.events = state.events.slice(0, 30);
}

export function useGameState() {
  const state = reactive(loadState());
  const quiz = ref(null);
  let tickTimer = null;

  function persist() {
    persistState(state);
  }

  watch(state, persist, { deep: true });

  const hungerState = computed(() => getHungerState(state));
  const cleanlinessState = computed(() => getCleanlinessState(state));
  const expPercent = computed(() => Math.min(100, (state.exp / state.expToNext) * 100));
  const isDebuffed = computed(() => hungerState.value.debuff || state.debuffActive);

  watch(
    hungerState,
    (next, previous) => {
      state.debuffActive = next.debuff;
      if (previous && previous.label !== next.label && next.thought) {
        addEvent(state, next.thought);
      } else if (!previous && next.thought) {
        addEvent(state, '알고냥이 모험을 시작했어요!');
      }
    },
    { immediate: true }
  );

  function feed(amount) {
    if (state.food < amount) {
      addEvent(state, '먹이가 부족해요. 새로운 먹이를 준비하세요!');
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
    gainExperience(state, amount * 24, isDebuffed.value);
    addEvent(state, `${amount} 만큼 먹이를 주었어요.`);
  }

  function openQuiz() {
    if (state.cleanliness >= 80) {
      addEvent(state, '지금은 충분히 깨끗해요!');
      return;
    }
    const question = QUIZ_BANK[Math.floor(Math.random() * QUIZ_BANK.length)];
    quiz.value = {
      ...question,
      selected: null,
      feedback: '',
    };
  }

  function answerQuiz(index) {
    if (!quiz.value) return;
    quiz.value.selected = index;
    if (index === quiz.value.answer) {
      quiz.value.feedback = quiz.value.info;
      state.cleanliness = clamp(state.cleanliness + 30, 0, 100);
      state.lastCleanupCheck = Date.now();
      addEvent(state, '컴퓨터 공학 퀴즈를 풀고 청소를 마쳤어요!');
      window.setTimeout(closeQuiz, 1200);
    } else {
      const choice = quiz.value.choices[index];
      quiz.value.feedback = `${choice}? 다시 생각해봐요.`;
    }
  }

  function closeQuiz() {
    quiz.value = null;
  }

  function cleanInstantly() {
    state.cleanliness = clamp(state.cleanliness + 15, 0, 100);
    state.lastCleanupCheck = Date.now();
    addEvent(state, '알고냥이 주변을 정리했어요.');
  }

  function reset() {
    const next = deepClone(DEFAULT_STATE);
    next.events = [];
    state.name = next.name;
    state.level = next.level;
    state.exp = next.exp;
    state.expToNext = next.expToNext;
    state.coins = next.coins;
    state.food = next.food;
    state.lastFedAt = Date.now();
    state.lastFedDate = next.lastFedDate;
    state.streak = next.streak;
    state.bestStreak = next.bestStreak;
    state.debuffActive = false;
    state.cleanliness = next.cleanliness;
    state.lastCleanupCheck = Date.now();
    state.events = [];
    addEvent(state, '새로운 모험을 시작합니다!');
  }

  function tick() {
    decayCleanliness(state);
  }

  function start() {
    if (state.events.length === 0) {
      addEvent(state, '알고냥이 모험을 시작했어요!');
    }
    tick();
    if (tickTimer) {
      window.clearInterval(tickTimer);
    }
    tickTimer = window.setInterval(tick, 5 * 60 * 1000);
  }

  function stop() {
    if (tickTimer) {
      window.clearInterval(tickTimer);
      tickTimer = null;
    }
  }

  return {
    state,
    hungerState,
    cleanlinessState,
    expPercent,
    isDebuffed,
    events: computed(() => state.events),
    feed,
    openQuiz,
    answerQuiz,
    closeQuiz,
    cleanInstantly,
    reset,
    start,
    stop,
    quiz,
    formatRelativeTime,
  };
}
