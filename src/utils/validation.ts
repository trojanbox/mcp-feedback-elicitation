/**
 * 参数验证工具
 */

export interface ValidatedFeedbackParams {
  project_directory: string;
  summary: string;
}

export interface RawFeedbackParams {
  project_directory?: string;
  summary?: string;
}

/**
 * 验证和标准化反馈参数
 */
export function validateFeedbackParams(params: RawFeedbackParams): ValidatedFeedbackParams {
  // 验证项目目录
  let projectDirectory = params.project_directory || '.';
  if (typeof projectDirectory !== 'string') {
    projectDirectory = '.';
  }
  
  // 去除首尾空白并处理空字符串
  projectDirectory = projectDirectory.trim();
  if (!projectDirectory) {
    projectDirectory = '.';
  }

  // 验证摘要
  let summary = params.summary || '我已完成了您请求的任务。';
  if (typeof summary !== 'string') {
    summary = '我已完成了您请求的任务。';
  }
  
  // 去除首尾空白并处理空字符串
  summary = summary.trim();
  if (!summary) {
    summary = '我已完成了您请求的任务。';
  }

  return {
    project_directory: projectDirectory,
    summary
  };
}

/**
 * 验证会话ID格式
 */
export function validateSessionId(sessionId: string): boolean {
  if (typeof sessionId !== 'string') {
    return false;
  }
  
  // 检查格式: feedback_timestamp_randomstring
  const pattern = /^feedback_\d+_[a-z0-9]+$/;
  return pattern.test(sessionId);
}

/**
 * 验证用户反馈内容
 */
export function validateUserFeedback(feedback: any): string {
  if (typeof feedback !== 'string') {
    return '';
  }
  
  return feedback.trim();
}

/**
 * 验证图片数据（Base64）
 * @deprecated 已移除图片功能
 */
export function validateImageData(imageData: any): string | null {
  // 图片功能已移除
  return null;
}

/**
 * 验证用户操作类型
 */
export function validateUserAction(action: any): string {
  const validActions = ['continue', 'stop', 'modify', 'clarify'];
  
  if (typeof action !== 'string') {
    return 'continue';
  }
  
  const normalizedAction = action.toLowerCase().trim();
  if (validActions.includes(normalizedAction)) {
    return normalizedAction;
  }
  
  return 'continue';
}

/**
 * 安全字符串截断
 */
export function safeTruncate(str: string, maxLength: number): string {
  if (typeof str !== 'string') {
    return '';
  }
  
  if (str.length <= maxLength) {
    return str;
  }
  
  return str.substring(0, maxLength - 3) + '...';
}
