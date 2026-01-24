import EventBusEnum from "@/enumeration/EventBusEnum";

import highlight from "highlight.js/lib/core";
import highlightJson from "highlight.js/lib/languages/json";

// 插件
import {Statistics} from "@/plugins/Statistics";


// 版本策略

// 事件
export const useIndexManageEvent = useEventBus<string>(EventBusEnum.INDEX_MANAGE);

// 代码高亮
highlight.registerLanguage('json', highlightJson);
export {highlight};

export const statistics = new Statistics();
