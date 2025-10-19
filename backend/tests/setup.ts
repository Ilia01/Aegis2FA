import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

beforeAll(async () => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
});

afterAll(async () => {
  await new Promise((resolve) => setTimeout(resolve, 500));
});
