import { createFeedbackSchema, FeedbackSchema } from './schema-builder';

describe('schema-builder', () => {
  describe('createFeedbackSchema', () => {
    it('should create a valid feedback schema with summary', () => {
      const summary = 'Test summary for feedback';
      const schema = createFeedbackSchema(summary);

      expect(schema.type).toBe('object');
      expect(schema.properties).toHaveProperty('feedback');
      expect(schema.properties.feedback.type).toBe('string');
      expect(schema.properties.feedback.title).toBe('您的反馈');
      expect(schema.properties.feedback.description).toContain(summary);
      expect(schema.properties.feedback.minLength).toBe(1);
      expect(schema.required).toEqual(['feedback']);
    });

    it('should handle empty summary', () => {
      const schema = createFeedbackSchema('');
      
      expect(schema.properties.feedback.description).toContain('基于以下 AI 工作摘要');
      expect(schema.properties.feedback.description).toContain('');
    });

    it('should handle long summary', () => {
      const longSummary = 'A'.repeat(1000);
      const schema = createFeedbackSchema(longSummary);
      
      expect(schema.properties.feedback.description).toContain(longSummary);
    });

    it('should handle summary with special characters', () => {
      const specialSummary = 'Summary with "quotes" and \n newlines \t tabs';
      const schema = createFeedbackSchema(specialSummary);
      
      expect(schema.properties.feedback.description).toContain(specialSummary);
    });
  });
});
