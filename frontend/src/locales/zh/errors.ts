export default {
  'error.notFoundTitle': '未找到',
  'error.notFoundMessage': '找不到该实体，它可能属于其他主题。',
  'error.networkTitle': '连接问题',
  'error.networkMessage': '无法连接后端服务，请确认服务是否运行。',
  'error.parseTitle': '出错了',
  'error.parseMessage': '无法读取响应，请重试。',
  // M74 Phase1 (C3): backend rejected the topic format (HTTP 400,
  // TOPIC_PATTERN ^[a-z0-9_-]+$). Copy mirrors the backend detail message.
  'error.invalidTopicTitle': '主题无效',
  'error.invalidTopicMessage':
    '后端仅接受英文主题名（小写字母、数字、下划线或连字符，如 roman_empire）。请尝试上方搜索或探索包。',
}
