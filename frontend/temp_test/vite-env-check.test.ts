import { it, expect } from 'vitest';
it('import.meta.env works', () => {
  const url = import.meta.env.VITE_API_URL;
  console.log('VITE_API_URL from import.meta.env:', url);
  expect(url).toBe('http://localhost:5001/api/v1');
});
