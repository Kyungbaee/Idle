<template>
  <div class="app-root">
    <AuthScreen
      v-if="!isAuthenticated"
      :loading="auth.loading.value"
      :error="auth.error.value"
      :enable-demo="auth.enableDemoLogin"
      @github="auth.loginWithGitHub"
      @demo="auth.loginDemo"
    />
    <GameShell
      v-else
      :state="game.state"
      :hunger-state="game.hungerState"
      :cleanliness-state="game.cleanlinessState"
      :exp-percent="game.expPercent"
      :events="game.events"
      :is-debuffed="game.isDebuffed"
      :session="auth.session.value"
      :quiz="game.quiz"
      :format-relative-time="game.formatRelativeTime"
      @feed="game.feed"
      @quiz="game.openQuiz"
      @clean="game.cleanInstantly"
      @reset="game.reset"
      @logout="handleLogout"
      @answer="game.answerQuiz"
      @close-quiz="game.closeQuiz"
    />
    <div v-if="auth.loading.value" class="loading-overlay" role="status">로그인 처리 중...</div>
  </div>
</template>

<script setup>
import { onMounted, watch } from 'vue';
import AuthScreen from '@/components/AuthScreen.vue';
import GameShell from '@/components/GameShell.vue';
import { useAuth } from '@/composables/useAuth';
import { useGameState } from '@/composables/useGameState';

const auth = useAuth();
const game = useGameState();

const isAuthenticated = auth.isAuthenticated;

onMounted(() => {
  auth.handleOAuthRedirect();
});

watch(
  isAuthenticated,
  (next) => {
    if (next) {
      game.start();
    } else {
      game.stop();
    }
  },
  { immediate: true }
);

function handleLogout() {
  auth.logout();
  game.stop();
}
</script>
