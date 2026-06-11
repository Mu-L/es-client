import { createI18n } from 'vue-i18n'
import messages from '@intlify/unplugin-vue-i18n/messages'
import LocalNameEnum from '@/enumeration/LocalNameEnum'

// 映射：Chrome 语言标签 → Vue I18n 语言标签
function mapChromeLangToVueLang(chromeLang: string): string {
  if (chromeLang === 'zh-CN' || chromeLang === 'zh') return 'zh-CN'
  if (chromeLang === 'zh-TW') return 'zh-TW'
  if (chromeLang.startsWith('zh')) return 'zh-CN' // 兜底简体
  if (chromeLang.startsWith('en')) return 'en'
  if (chromeLang.startsWith('ja')) return 'ja'
  if (chromeLang.startsWith('de')) return 'de'
  return 'en'
}

export type LocaleLanguage = 'zh-CN' | 'zh-TW' | 'en' | 'ja' | 'de'
const SUPPORT_LANGUAGE = ['zh-CN', 'zh-TW', 'en', 'ja', 'de']

let initialLocale = localStorage.getItem(LocalNameEnum.KEY_LOCAL)

try {
  // 没有设置语言，尝试获取 chrome 的语言
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  if (window.chrome && !initialLocale) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const chromeLanguage = chrome.i18n.getUILanguage()
    initialLocale = mapChromeLangToVueLang(chromeLanguage)
  }
} catch (e) {
  console.error('初始化语言失败', e)
}

const i18n = createI18n({
  legacy: true, // support Options API
  allowComposition: true, // support Composition API
  locale: initialLocale && SUPPORT_LANGUAGE.includes(initialLocale) ? initialLocale : 'en',
  fallbackLocale: 'en',
  messages
})

export default i18n

/**
 * 切换语言（并持久化到本地存储）
 * @param newLocale 目标语言标识（zh 或 en）
 */
export const switchLanguage = (newLocale: LocaleLanguage) => {
  // 1. 更新 I18n 实例的当前语言
  i18n.global.locale = newLocale
  // 2. 持久化到本地存储（下次打开页面仍保持该语言）
  localStorage.setItem(LocalNameEnum.KEY_LOCAL, newLocale)
}

/**
 * 非组件环境下的翻译函数（如工具类、Store 中使用）
 * @param key 翻译键（如 Header.index）
 * @param named 翻译参数（可选）
 * @returns 翻译后的文本（失败时返回原键名，避免页面空白）
 */
export const t = (key: string, named?: Record<string, unknown>) =>
  named ? i18n.global.t(key, named) : i18n.global.t(key)
