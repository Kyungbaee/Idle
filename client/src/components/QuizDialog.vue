<template>
  <dialog class="quiz" aria-labelledby="quiz-heading" open>
    <form method="dialog" class="quiz__container" @submit.prevent>
      <h2 id="quiz-heading">청소 퀴즈</h2>
      <p class="quiz__question">{{ quiz.question }}</p>
      <div class="quiz__choices">
        <button
          v-for="(choice, index) in quiz.choices"
          :key="choice"
          class="primary"
          type="button"
          @click="() => onSelect(index)"
          :disabled="quiz.selected !== null && quiz.selected !== index"
        >
          {{ index + 1 }}. {{ choice }}
        </button>
      </div>
      <p v-if="quiz.feedback" class="quiz__feedback" role="status">{{ quiz.feedback }}</p>
      <div class="quiz__actions">
        <button class="secondary" type="button" @click="onClose">닫기</button>
      </div>
    </form>
  </dialog>
</template>

<script setup>
const props = defineProps({
  quiz: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['select', 'close']);

function onSelect(index) {
  emit('select', index);
}

function onClose() {
  emit('close');
}
</script>
