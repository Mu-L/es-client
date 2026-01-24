/**
 * 聊天组件，就是 chat2es 右侧部分的组件定义
 */

import { TableColumn } from "$/shared/common";
import { DataSourceRecord } from "$/elasticsearch-client";

export type ChatComponentType =
  | "rest"
  | "table"
  | "echarts"
  | "json"
  | "settings"
  // app才有
  | "app-echarts";

interface ChatComponentBase {
  // 组件 id
  id: string;
  // 组件创建时间
  created_at: number;
  // 组件类型
  type: ChatComponentType;
}

interface ChatComponentRest extends ChatComponentBase {
  type: "rest";
  // rest 组件的查询语句
  query: string;
}

interface ChatComponentTable extends ChatComponentBase {
  type: "table";
  result: string;
  columns: Array<TableColumn>;
  records: Array<DataSourceRecord>;
}

interface ChatComponentEcharts extends ChatComponentBase {
  type: "echarts";
  result: string;
  records: Array<DataSourceRecord>;
  // echarts 组件的配置
  config: Record<string, any>;
}

interface ChatComponentJson extends ChatComponentBase {
  type: "json";
  // json 组件的查询语句
  result: string;
}

interface ChatComponentSettings extends ChatComponentBase {
  type: "settings";
}

interface ChatComponentAppEcharts extends ChatComponentBase {
  type: "app-echarts";
  result: string;
  records: Array<DataSourceRecord>;
  // 映射函数，可以通过定义函数的方式将 records 中的数据映射到 echarts 组件的配置中
  func: string;
}

export type ChatComponent =
  | ChatComponentRest
  | ChatComponentTable
  | ChatComponentEcharts
  | ChatComponentJson
  | ChatComponentSettings
  | ChatComponentAppEcharts;
