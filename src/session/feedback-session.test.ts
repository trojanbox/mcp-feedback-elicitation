import { FeedbackSession, FeedbackSessionData } from './feedback-session';

describe('feedback-session', () => {
  describe('FeedbackSession', () => {
    let session: FeedbackSession;
    const sessionId = 'test-session-123';
    const projectDirectory = '/test/project';
    const summary = 'Test summary for session';

    beforeEach(() => {
      session = new FeedbackSession(sessionId, projectDirectory, summary);
    });

    it('should create session with initial data', () => {
      expect(session.id).toBe(sessionId);
      
      const data = session.getData();
      expect(data.sessionId).toBe(sessionId);
      expect(data.projectDirectory).toBe(projectDirectory);
      expect(data.summary).toBe(summary);
      expect(data.status).toBe('waiting');
      expect(data.startTime).toBeGreaterThan(0);
      expect(data.endTime).toBeUndefined();
      expect(data.userFeedback).toBeUndefined();
      expect(data.userAction).toBeUndefined();
    });

    it('should set user feedback and action', () => {
      const feedback = 'Great work!';
      const action = 'continue';

      session.setUserFeedback(feedback, action);

      const data = session.getData();
      expect(data.userFeedback).toBe(feedback);
      expect(data.userAction).toBe(action);
      expect(data.status).toBe('completed');
      expect(data.endTime).toBeGreaterThanOrEqual(data.startTime);
    });

    it('should calculate response time correctly', async () => {
      const initialTime = session.getResponseTime();
      expect(initialTime).toBeNull();

      // Wait some time
      await new Promise(resolve => setTimeout(resolve, 10));
      
      session.setUserFeedback('Test feedback', 'continue');
      const responseTime = session.getResponseTime();
      expect(responseTime).toBeGreaterThan(5);
    });

    it('should return null response time before completion', () => {
      const responseTime = session.getResponseTime();
      expect(responseTime).toBeNull();
    });

    it('should return immutable copy of data', () => {
      const data1 = session.getData();
      const data2 = session.getData();
      
      expect(data1).not.toBe(data2); // Different objects
      expect(data1).toEqual(data2); // Same content
      
      // Modifying returned data should not affect session
      data1.status = 'error';
      expect(session.getData().status).toBe('waiting');
    });

    it('should handle empty parameters gracefully', () => {
      const emptySession = new FeedbackSession('', '', '');
      
      expect(emptySession.id).toBe('');
      const data = emptySession.getData();
      expect(data.sessionId).toBe('');
      expect(data.projectDirectory).toBe('');
      expect(data.summary).toBe('');
    });

    it('should handle setting empty feedback', () => {
      session.setUserFeedback('', 'stop');
      
      const data = session.getData();
      expect(data.userFeedback).toBe('');
      expect(data.userAction).toBe('stop');
      expect(data.status).toBe('completed');
    });

    it('should maintain start time consistency', async () => {
      const data1 = session.getData();
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 5));
      
      const data2 = session.getData();
      expect(data1.startTime).toBe(data2.startTime);
    });

    it('should set end time only once', async () => {
      session.setUserFeedback('First feedback', 'continue');
      const firstEndTime = session.getData().endTime;
      
      // Wait to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Try to set again
      session.setUserFeedback('Second feedback', 'stop');
      const secondEndTime = session.getData().endTime;
      expect(firstEndTime).toBe(secondEndTime);
    });
  });
});
