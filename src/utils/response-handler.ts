/**
 * Elicitation 响应处理工具
 */

import { FeedbackSession } from '../session/feedback-session.js';

export interface FeedbackResult {
  success: boolean;
  feedback: string;
  action: string;
  session_info: {
    session_id: string;
    project_directory: string;
    response_time_ms: number | null;
    status: string;
  };
  message?: string;
  error?: string;
}

/**
 * 处理 elicitation 响应
 */
export function handleElicitationResponse(
  elicitResult: any, // ElicitResult from MCP SDK
  session: FeedbackSession
): FeedbackResult {
  const sessionData = session.getData();

  try {
    switch (elicitResult.action) {
      case 'accept':
        const feedback = elicitResult.content?.feedback || '';
        const action = 'continue'; // 固定为 continue，不再从用户输入获取

        // 更新会话数据
        session.setUserFeedback(feedback, action);

        return {
          success: true,
          feedback,
          action,
          session_info: {
            session_id: sessionData.sessionId,
            project_directory: sessionData.projectDirectory,
            response_time_ms: session.getResponseTime(),
            status: 'completed'
          },
          message: `用户反馈收集完成。反馈内容：${feedback.substring(0, 100)}${feedback.length > 100 ? '...' : ''}`
        };

      case 'decline':
        session.updateStatus('completed');
        
        return {
          success: false,
          feedback: '',
          action: 'declined',
          session_info: {
            session_id: sessionData.sessionId,
            project_directory: sessionData.projectDirectory,
            response_time_ms: session.getResponseTime(),
            status: 'completed'
          },
          message: '用户拒绝提供反馈。',
          error: 'User declined to provide feedback'
        };

      case 'cancel':
        session.updateStatus('completed');
        
        return {
          success: false,
          feedback: '',
          action: 'cancelled',
          session_info: {
            session_id: sessionData.sessionId,
            project_directory: sessionData.projectDirectory,
            response_time_ms: session.getResponseTime(),
            status: 'completed'
          },
          message: '用户取消了反馈操作。',
          error: 'User cancelled the feedback operation'
        };

      default:
        throw new Error(`Unknown elicitation response action: ${elicitResult.action}`);
    }
  } catch (error) {
    session.updateStatus('error');
    
    return {
      success: false,
      feedback: '',
      action: 'error',
      session_info: {
        session_id: sessionData.sessionId,
        project_directory: sessionData.projectDirectory,
        response_time_ms: session.getResponseTime(),
        status: 'error'
      },
      message: '处理用户反馈时发生错误。',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
