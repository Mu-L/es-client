<template>
  <div class="abs-8 !right-0 material-card p-8px flex flex-col min-w-200px">
    <div class="flex justify-between items-center">
      <div>CHAT2ES</div>
      <div class="flex gap-8px">
        <t-button size="small" theme="primary" variant="text" shape="square">
          <template #icon>
            <chat-bubble-add-icon />
          </template>
        </t-button>
      </div>
    </div>
    <div class="flex-1">
      <t-empty title="空空如也" class="mt-25vh" />
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ChatBubbleAddIcon } from 'tdesign-icons-vue-next'
</script>
<style scoped lang="less"></style>
