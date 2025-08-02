import { handleElicitationResponse, FeedbackResult } from './response-handler';
import { FeedbackSession } from '../session/feedback-session';

describe('response-handler', () => {
  let session: FeedbackSession;

  beforeEach(() => {
    session = new FeedbackSession('test-session', '/test/project', 'Test summary');
  });

  describe('handleElicitationResponse', () => {
    it('should handle accept action with feedback', () => {
      const elicitResult = {
        action: 'accept',
        content: { feedback: 'This is great feedback!' }
      };

      const result = handleElicitationResponse(elicitResult, session);

      expect(result.success).toBe(true);
      expect(result.feedback).toBe('This is great feedback!');
      expect(result.action).toBe('continue');
      expect(result.session_info.session_id).toBe('test-session');
      expect(result.session_info.project_directory).toBe('/test/project');
      expect(result.session_info.status).toBe('completed');
      expect(result.message).toContain('用户反馈收集完成');
    });

    it('should handle accept action with empty feedback', () => {
      const elicitResult = {
        action: 'accept',
        content: { feedback: '' }
      };

      const result = handleElicitationResponse(elicitResult, session);

      expect(result.success).toBe(true);
      expect(result.feedback).toBe('');
      expect(result.action).toBe('continue');
    });

    it('should handle accept action without content', () => {
      const elicitResult = {
        action: 'accept'
      };

      const result = handleElicitationResponse(elicitResult, session);

      expect(result.success).toBe(true);
      expect(result.feedback).toBe('');
      expect(result.action).toBe('continue');
    });

    it('should handle decline action', () => {
      const elicitResult = {
        action: 'decline'
      };

      const result = handleElicitationResponse(elicitResult, session);

      expect(result.success).toBe(false);
      expect(result.feedback).toBe('');
      expect(result.action).toBe('declined');
      expect(result.session_info.status).toBe('completed');
      expect(result.message).toBe('用户拒绝提供反馈。');
      expect(result.error).toBe('User declined to provide feedback');
    });

    it('should handle cancel action', () => {
      const elicitResult = {
        action: 'cancel'
      };

      const result = handleElicitationResponse(elicitResult, session);

      expect(result.success).toBe(false);
      expect(result.feedback).toBe('');
      expect(result.action).toBe('cancelled');
      expect(result.session_info.status).toBe('completed');
      expect(result.message).toBe('用户取消了反馈操作。');
      expect(result.error).toBe('User cancelled the feedback operation');
    });

    it('should handle unknown action through error handling', () => {
      const elicitResult = {
        action: 'unknown'
      };

      const result = handleElicitationResponse(elicitResult, session);

      expect(result.success).toBe(false);
      expect(result.feedback).toBe('');
      expect(result.action).toBe('error');
      expect(result.session_info.status).toBe('error');
      expect(result.message).toBe('处理用户反馈时发生错误。');
      expect(result.error).toContain('Unknown elicitation response action: unknown');
    });

    it('should truncate long feedback in message', () => {
      const longFeedback = 'A'.repeat(200);
      const elicitResult = {
        action: 'accept',
        content: { feedback: longFeedback }
      };

      const result = handleElicitationResponse(elicitResult, session);

      expect(result.feedback).toBe(longFeedback);
      expect(result.message).toContain('...');
      expect(result.message?.length).toBeLessThan(longFeedback.length + 50);
    });

    it('should include response time when available', async () => {
      // Wait some time before setting feedback
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const elicitResult = {
        action: 'accept',
        content: { feedback: 'Test' }
      };

      const result = handleElicitationResponse(elicitResult, session);
      expect(result.session_info.response_time_ms).toBeGreaterThan(5);
    });
  });
});
