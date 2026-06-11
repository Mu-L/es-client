<template>
  <div class="abs-0">
    <SplitPanel v-model="size">
      <template #left>
        <chat-left />
      </template>
      <template #right>
        <chat-right />
      </template>
    </SplitPanel>
  </div>
</template>
<script lang="ts" setup>
import LocalNameEnum from '@/enumeration/LocalNameEnum'
import ChatLeft from '@/page/chat2es/layouts/ChatLeft.vue'
import ChatRight from '@/page/chat2es/layouts/ChatRight.vue'

const size = useSessionStorage(LocalNameEnum.KEY_CHAT_SIZE, 400)
</script>
<style scoped lang="less"></style>
