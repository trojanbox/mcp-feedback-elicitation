/**
 * 用户反馈会话管理
 */

export interface FeedbackSessionData {
  sessionId: string;
  projectDirectory: string;
  summary: string;
  startTime: number;
  endTime?: number;
  userFeedback?: string;
  userAction?: string;
  status: 'waiting' | 'completed' | 'error';
}

/**
 * 反馈会话类
 */
export class FeedbackSession {
  private data: FeedbackSessionData;

  constructor(
    sessionId: string,
    projectDirectory: string,
    summary: string
  ) {
    this.data = {
      sessionId,
      projectDirectory,
      summary,
      startTime: Date.now(),
      status: 'waiting'
    };
  }

  /**
   * 获取会话ID
   */
  get id(): string {
    return this.data.sessionId;
  }

  /**
   * 获取会话数据
   */
  getData(): FeedbackSessionData {
    return { ...this.data };
  }

  /**
   * 更新会话状态
   */
  updateStatus(status: FeedbackSessionData['status']): void {
    this.data.status = status;
    if ((status === 'completed' || status === 'error') && !this.data.endTime) {
      this.data.endTime = Date.now();
    }
  }

  /**
   * 设置用户反馈
   */
  setUserFeedback(feedback: string, action?: string): void {
    this.data.userFeedback = feedback;
    this.data.userAction = action;
    this.updateStatus('completed');
  }

  /**
   * 获取响应时间（毫秒）
   */
  getResponseTime(): number | null {
    if (!this.data.endTime) return null;
    return this.data.endTime - this.data.startTime;
  }
}
