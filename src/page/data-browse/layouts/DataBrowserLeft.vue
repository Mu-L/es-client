<template>
  <div class="abs-8 !right-0 overflow-auto material-card" ref="dataBrowserLeft">
    <div class="p-12px border-b border-gray-200">
      <t-input
        v-model="searchText"
        :placeholder="t('module.data_browse.search_placeholder')"
        clearable
        @input="onSearchInput"
      >
        <template #prefix-icon>
          <search-icon />
        </template>
      </t-input>
    </div>
    <div class="abs-0 overflow-auto px-12px" style="top: 60px">
      <t-tree
        :data="filteredData"
        activable
        line
        :scroll="{
          rowHeight: 34,
          bufferSize: 10,
          threshold: 10,
          type: 'virtual'
        }"
        :height="height"
        :actived="actives"
      >
        <template #label="{ node }">
          <div
            class="flex items-center w-full"
            @click="onClick(node)"
            @dblclick="onDbClick(node)"
            @contextmenu="openContextmenu(node, $event)"
          >
            <div class="mr-8px">
              <folder-icon v-if="node.value.startsWith('folder-')" />
              <bookmark-double-icon
                v-else-if="node.value.startsWith('view-')"
                :fill-color="['transparent', 'transparent']"
                :stroke-color="['currentColor', '#0052d9']"
                :stroke-width="2"
              />
              <tag-icon
                v-else-if="node.value.startsWith('alias-')"
                :fill-color="['transparent', 'transparent']"
                :stroke-color="['currentColor', '#0052d9']"
                :stroke-width="2"
              />
              <table-icon
                v-else-if="node.value.startsWith('index-')"
                :fill-color="['transparent', 'transparent']"
                :stroke-color="['currentColor', '#0052d9']"
                :stroke-width="2"
              />
              <code-icon
                v-else-if="node.value.startsWith('query-')"
                :fill-color="['transparent', 'transparent']"
                :stroke-color="['currentColor', '#0052d9']"
                :stroke-width="2"
              />
              <file-icon v-else />
            </div>
            <div>
              <div class="text-12px">{{ node.label }}</div>
            </div>
          </div>
        </template>
        <template #operations="{ node }">
          <t-button
            v-if="node.value === 'folder-view'"
            theme="primary"
            size="small"
            variant="text"
            shape="square"
            :disabled="!urlId"
            @click="onAddView"
          >
            <template #icon>
              <add-icon />
            </template>
          </t-button>
          <t-button
            v-else-if="node.value === 'folder-query'"
            theme="primary"
            size="small"
            variant="text"
            shape="square"
            :disabled="!urlId"
            @click="onAddQuery"
          >
            <template #icon>
              <add-icon />
            </template>
          </t-button>
          <t-button
            v-else-if="node.value.startsWith('view')"
            theme="danger"
            size="small"
            variant="text"
            shape="square"
            :disabled="!urlId"
            @click="onRemoveView(node)"
          >
            <template #icon>
              <delete-icon style="color: var(--td-error-color)" />
            </template>
          </t-button>
          <div v-else-if="node.value.startsWith('query')" class="flex">
            <t-button
              theme="primary"
              size="small"
              variant="text"
              shape="square"
              :disabled="!urlId"
              @click="onRenameQuery(node)"
            >
              <template #icon>
                <edit-icon />
              </template>
            </t-button>
            <t-button
              theme="danger"
              size="small"
              variant="text"
              shape="square"
              :disabled="!urlId"
              @click="onRemoveQuery(node)"
            >
              <template #icon>
                <delete-icon style="color: var(--td-error-color)" />
              </template>
            </t-button>
          </div>
        </template>
      </t-tree>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { TreeNodeModel, TreeOptionData } from 'tdesign-vue-next'
import { useIndexStore, useUrlStore } from '@/store'
import {
  AddIcon,
  BookmarkDoubleIcon,
  CodeIcon,
  DeleteIcon,
  EditIcon,
  FileIcon,
  FolderIcon,
  TableIcon,
  TagIcon,
  SearchIcon
} from 'tdesign-icons-vue-next'
import { decodeValue, encodeValue, useDataBrowseStore } from '@/store/components/DataBrowseStore'
import { useDataBrowserViewStore } from '@/store/components/DataBrowserViewStore'
import { useDataBrowserQueryStore } from '@/store/components/DataBrowserQueryStore'
import { openContextmenu } from '@/page/data-browse/func/DbLeftContextmenu'
import i18n from '@/i18n'

const t = (key: string) => i18n.global.t(key)

const dataBrowserLeftRef = useTemplateRef<HTMLDivElement>('dataBrowserLeft')

const elementSize = useElementSize(dataBrowserLeftRef)

const actives = useSessionStorage<Array<string>>('/home/data-browser/left/active-value', [])

const height = computed(() => elementSize.height.value - 100)

const searchText = ref('')

const index = computed(() => {
  const { list } = useIndexStore()
  return list.map((e) => e.name).sort((a, b) => a.localeCompare(b, 'zh'))
})
const alias = computed(() => {
  const { list } = useIndexStore()
  return Array.from(new Set(list.flatMap((e) => e.alias))).sort((a, b) => a.localeCompare(b, 'zh'))
})

const view = computed(() => useDataBrowserViewStore().views)
const query = computed(() => useDataBrowserQueryStore().query)
const data = computed<Array<TreeOptionData>>(() => [
  {
    label: t('module.data_browse.index'),
    value: encodeValue('folder', 'index'),
    children: index.value.map((e) => ({
      label: e,
      value: encodeValue('index', e)
    }))
  },
  {
    label: t('module.data_browse.alias'),
    value: encodeValue('folder', 'alias'),
    children: alias.value.map((e) => ({
      label: e,
      value: encodeValue('alias', e)
    }))
  },
  {
    label: t('module.data_browse.view'),
    value: encodeValue('folder', 'view'),
    children: view.value.map((e) => ({
      label: e.pattern,
      value: encodeValue('view', e.pattern),
      sourceId: e.id
    }))
  },
  {
    label: t('module.data_browse.query'),
    value: encodeValue('folder', 'query'),
    children: query.value.map((e) => ({
      label: e.name,
      value: encodeValue('query', e.id)
    }))
  }
])

const urlId = computed(() => useUrlStore().id)

function flattenTree(nodes: TreeOptionData[]): TreeOptionData[] {
  const result: TreeOptionData[] = []

  function traverse(node: TreeOptionData, parent: TreeOptionData | null = null) {
    const flatNode = { ...node, parent }
    result.push(flatNode)
    if (node.children && Array.isArray(node.children) && node.children.length > 0) {
      node.children.forEach((child: TreeOptionData) => traverse(child, flatNode))
    }
  }

  nodes.forEach((node) => traverse(node))
  return result
}

function buildFilteredTree(flatNodes: TreeOptionData[]): TreeOptionData[] {
  const nodeMap = new Map<string, TreeOptionData>()
  const childMap = new Map<string, TreeOptionData[]>()
  const rootValues = new Set<string>()

  flatNodes.forEach((node) => {
    const nodeCopy = { ...node }
    delete nodeCopy.parent
    nodeMap.set(node.value as string, nodeCopy)
    if (!node.parent) {
      rootValues.add(node.value as string)
    }
  })

  flatNodes.forEach((node) => {
    if (node.parent) {
      const parentValue = node.parent.value as string
      if (!childMap.has(parentValue)) {
        childMap.set(parentValue, [])
      }
      childMap.get(parentValue)!.push(nodeMap.get(node.value as string)!)
    }
  })

  const rootNodes: TreeOptionData[] = []
  nodeMap.forEach((node) => {
    const children = childMap.get(node.value as string)
    if (children && children.length > 0) {
      node.children = children
    }
    if (rootValues.has(node.value as string)) {
      rootNodes.push(node)
    }
  })

  return rootNodes
}

const filteredData = computed(() => {
  if (!searchText.value.trim()) {
    return data.value
  }

  const flatNodes = flattenTree(data.value)
  const searchLower = searchText.value.toLowerCase()

  const matchedNodeValues = new Set<string>()
  flatNodes.forEach((node) => {
    const label = String(node.label || '').toLowerCase()
    if (label.includes(searchLower)) {
      matchedNodeValues.add(node.value as string)
      let current = node.parent
      while (current) {
        matchedNodeValues.add(current.value as string)
        current = current.parent
      }
    }
  })

  const filteredFlatNodes = flatNodes.filter((node) => matchedNodeValues.has(node.value as string))
  return buildFilteredTree(filteredFlatNodes)
})

function onSearchInput() {
  actives.value = []
}

watch(
  () => useUrlStore().id,
  (value) => {
    useDataBrowserViewStore().init(`${value}`)
    useDataBrowserQueryStore().init(`${value}`)
  },
  { immediate: true }
)

function onClick(node: TreeNodeModel) {
  actives.value = [`${node.value}`]
}

function onDbClick(node: TreeNodeModel) {
  actives.value[0] = `${node.value}`
  useDataBrowseStore().openTab(`${node.value}`, node.label || `${Date.now()}`)
}

function onAddView() {
  useDataBrowserViewStore().add()
}

function onRemoveView(node: TreeNodeModel) {
  useDataBrowserViewStore().remove(node.data.sourceId!, node.label!)
}

function onAddQuery() {
  useDataBrowserQueryStore().add()
}

function onRenameQuery(node: TreeNodeModel) {
  const { label, value } = node
  const { id } = decodeValue(`${value}`)
  useDataBrowserQueryStore().rename(id, label!)
}

function onRemoveQuery(node: TreeNodeModel) {
  const { label, value } = node
  const { id } = decodeValue(`${value}`)
  useDataBrowserQueryStore().remove(id, label!)
}
</script>
<style scoped lang="less"></style>
