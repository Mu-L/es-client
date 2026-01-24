/**
 * 聊天记录
 */
export interface ChatRecord {
  // 记录 id
  id: string;
  // 记录创建时间
  created_at: number;
  // 记录更新时间 
  updated_at: number;

  // 记录名字，默认取第一次对话的前 10 个字符
  name: string;
}