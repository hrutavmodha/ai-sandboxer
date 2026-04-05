import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/server/app';

describe('Express Server Foundation Verification', () => {

  it('should correctly map defined paths (e.g., /api/todos) to their respective handlers', async () => {
    const res = await request(app).get('/api/todos');
    // A successful mapping should return a 200 status code for valid existing resources.
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should return 404 Not Found for invalid routes', async () => {
    const res = await request(app).get('/api/invalid-route');
    expect(res.status).toBe(404);
    // Specification requires formatted JSON for exceptions/errors.
    expect(res.header['content-type']).toMatch(/json/);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toMatch(/Not Found/i);
  });

  it('should return formatted JSON for exceptions and errors', async () => {
    // We can simulate an error by sending malformed JSON to a POST route.
    const res = await request(app)
      .post('/api/todos')
      .set('Content-Type', 'application/json')
      .send('{"invalid": json}'); // Intentional syntax error in JSON string
    
    // Express's JSON parser or the app's error handler should catch this and return a 400.
    expect(res.status).toBe(400);
    expect(res.header['content-type']).toMatch(/json/);
    expect(res.body).toHaveProperty('error');
  });

  it('should have CORS middleware present in the application stack', async () => {
    // OPTIONS request should return CORS headers if the middleware is active.
    const res = await request(app).options('/api/todos');
    expect(res.header).toHaveProperty('access-control-allow-origin');
    // We expect at least the origin to be handled, often '*' in development.
  });

});
