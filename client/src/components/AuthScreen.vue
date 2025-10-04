<template>
  <div class="auth-screen" aria-labelledby="auth-title">
    <div class="auth-screen__card">
      <div class="auth-screen__icon" aria-hidden="true">🐾</div>
      <h1 id="auth-title">Algo냥과 모험을 시작해요</h1>
      <p class="auth-screen__lead">
        깃허브 계정으로 로그인하면 알고냥이 사는 공간으로 입장할 수 있어요.
      </p>
      <div class="auth-screen__actions">
        <button class="auth-button" type="button" @click="onGitHub" :disabled="loading">
          <svg class="auth-button__icon" aria-hidden="true" viewBox="0 0 16 16">
            <path
              fill="currentColor"
              d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38v-1.33c-2.01.44-2.53-.86-2.53-.86-.36-.91-.88-1.16-.88-1.16-.72-.5.05-.49.05-.49.8.06 1.22.82 1.22.82.71 1.21 1.86.86 2.31.66.07-.52.28-.87.5-1.07-1.6-.18-3.28-.8-3.28-3.56 0-.79.28-1.43.74-1.94-.07-.18-.32-.9.07-1.87 0 0 .6-.19 1.97.74a6.84 6.84 0 0 1 3.59 0c1.36-.93 1.96-.74 1.96-.74.39.97.14 1.69.07 1.87.46.51.74 1.15.74 1.94 0 2.77-1.68 3.38-3.29 3.56.28.24.53.73.53 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 8 0Z"
            />
          </svg>
          GitHub으로 로그인
        </button>
        <button
          v-if="enableDemo"
          class="auth-button auth-button--ghost"
          type="button"
          @click="onDemo"
          :disabled="loading"
        >
          체험 모드로 둘러보기
        </button>
      </div>
      <p v-if="error" class="auth-screen__error" role="alert">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  loading: Boolean,
  error: String,
  enableDemo: Boolean,
});

const emit = defineEmits(['github', 'demo']);

function onGitHub() {
  emit('github');
}

function onDemo() {
  emit('demo');
}
</script>
