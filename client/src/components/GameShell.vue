<template>
  <div class="game-shell">
    <header class="hud hud--top" aria-label="캐릭터 상태 패널">
      <div class="hud__identity">
        <div class="pet-badge" aria-hidden="true">
          <div class="pet-badge__ear left"></div>
          <div class="pet-badge__ear right"></div>
          <div class="pet-badge__face">
            <span class="pet-badge__eye left"></span>
            <span class="pet-badge__eye right"></span>
            <span class="pet-badge__mouth"></span>
          </div>
        </div>
        <div class="hud__name">
          <h1 id="character-name">{{ state.name }}</h1>
          <p class="hud__level">Lv. <span id="character-level">{{ state.level }}</span></p>
        </div>
      </div>
      <div class="hud__meters">
        <div class="meter">
          <span class="meter__label">경험치</span>
          <div class="meter__track">
            <div id="exp-bar" class="meter__fill" :style="{ width: `${expPercent}%` }"></div>
          </div>
          <span id="exp-label" class="meter__value">{{ state.exp }} / {{ state.expToNext }}</span>
        </div>
        <div class="meter">
          <span class="meter__label">허기</span>
          <div class="meter__track">
            <div
              id="hunger-bar"
              class="meter__fill"
              :style="{ width: `${Math.max(0, hungerState.percent)}%` }"
            ></div>
          </div>
          <span id="hunger-status" class="meter__tag">{{ hungerState.label }}</span>
        </div>
        <div class="meter">
          <span class="meter__label">청결도</span>
          <div class="meter__track">
            <div
              id="cleanliness-bar"
              class="meter__fill"
              :style="{ width: `${Math.max(0, cleanlinessState.percent)}%` }"
            ></div>
          </div>
          <span id="cleanliness-status" class="meter__tag">{{ cleanlinessState.label }}</span>
        </div>
      </div>
      <div class="hud__inventory" aria-live="polite">
        <span class="chip">
          <span>재화</span>
          <strong id="coins">{{ state.coins.toLocaleString() }}</strong>
        </span>
        <span class="chip">
          <span>먹이</span>
          <strong id="food-stock">{{ state.food.toLocaleString() }}</strong>
        </span>
        <span class="chip">
          <span>연속 급식</span>
          <strong id="feed-streak">{{ state.streak }}일</strong>
        </span>
        <button class="chip chip--reset" type="button" @click="emit('reset')">초기화</button>
      </div>
      <div class="hud__user" aria-live="polite" v-if="session">
        <img
          v-if="session.user.avatar_url"
          :src="session.user.avatar_url"
          class="hud__avatar"
          alt="사용자 아바타"
        />
        <div class="hud__user-meta">
          <span id="user-name" class="hud__user-name">{{ displayName }}</span>
          <span id="user-handle" class="hud__user-handle">@{{ session.user.login }}</span>
        </div>
        <button class="chip chip--ghost" type="button" @click="emit('logout')">로그아웃</button>
      </div>
    </header>

    <main class="playground" aria-live="polite">
      <div class="playground__scene">
        <div class="playground__horizon" aria-hidden="true"></div>
        <div class="playground__sun" aria-hidden="true"></div>
        <div class="playground__sparkles" aria-hidden="true"></div>

        <div id="pet" class="pet" role="img" aria-label="알고냥">
          <div class="pet__ear left"></div>
          <div class="pet__ear right"></div>
          <div class="pet__body">
            <div class="pet__eye left"></div>
            <div class="pet__eye right"></div>
            <div class="pet__nose"></div>
            <div class="pet__mouth"></div>
            <div class="pet__belly"></div>
          </div>
          <div class="pet__tail"></div>
        </div>
        <div class="pet__shadow" aria-hidden="true"></div>
        <div v-if="isDebuffed" class="banner is-visible" role="status">
          허기로 인해 경험치 보상이 감소 중
        </div>
      </div>
    </main>

    <footer class="hud hud--bottom">
      <section class="card card--actions" aria-labelledby="action-heading">
        <div class="card__header">
          <h2 id="action-heading">돌보기</h2>
          <p>먹이를 주거나 놀아주어 허기를 달래세요.</p>
        </div>
        <div class="action-buttons">
          <button class="primary" type="button" @click="() => emit('feed', 1)">간식 (-1)</button>
          <button class="primary" type="button" @click="() => emit('feed', 3)">식사 (-3)</button>
          <button class="primary" type="button" @click="() => emit('feed', 5)">만찬 (-5)</button>
        </div>
        <p id="hunger-detail" class="card__hint">{{ hungerState.detail }}</p>
      </section>

      <section class="card card--clean" aria-labelledby="clean-heading">
        <div class="card__header">
          <h2 id="clean-heading">환경 정리</h2>
          <p>청결도가 낮아지면 퀴즈를 풀어 주변을 정리하세요.</p>
        </div>
        <div class="cleanliness-display">
          <span id="cleanliness-detail">{{ cleanlinessState.detail }}</span>
          <div class="cleanliness-display__actions">
            <button class="primary" type="button" @click="emit('quiz')">청소 퀴즈 풀기</button>
            <button class="secondary" type="button" @click="emit('clean')">간단 청소</button>
          </div>
        </div>
      </section>

      <section class="card card--events" aria-labelledby="event-heading">
        <div class="card__header">
          <h2 id="event-heading">활동 기록</h2>
          <p>알고냥과의 추억을 모아보세요.</p>
        </div>
        <ul id="event-log" class="log-list">
          <li v-for="event in events" :key="event.id" class="log-item">
            <span class="log-item__title">{{ event.message }}</span>
            <span class="log-item__detail">{{ formatRelativeTime(event.at) }}</span>
          </li>
        </ul>
      </section>
    </footer>

    <QuizDialog v-if="quiz" :quiz="quiz" @select="(index) => emit('answer', index)" @close="() => emit('close-quiz')" />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import QuizDialog from './QuizDialog.vue';

const props = defineProps({
  state: {
    type: Object,
    required: true,
  },
  hungerState: {
    type: Object,
    required: true,
  },
  cleanlinessState: {
    type: Object,
    required: true,
  },
  expPercent: {
    type: Number,
    required: true,
  },
  events: {
    type: Array,
    required: true,
  },
  isDebuffed: Boolean,
  session: Object,
  quiz: Object,
  formatRelativeTime: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(['feed', 'quiz', 'clean', 'reset', 'logout', 'answer', 'close-quiz']);

const displayName = computed(() => {
  if (!props.session) return '';
  const user = props.session.user;
  return user.name || user.displayName || user.login;
});
</script>
