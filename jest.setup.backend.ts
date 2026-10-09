import { pool } from '@/server/db';

afterAll(async () => {
  await pool.end();
});
