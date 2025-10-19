import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import lusca from 'lusca';
import routes from '../../src/routes';
import { errorHandler, notFoundHandler } from '../../src/middleware/error.middleware';

export const createTestApp = (): Application => {
  const app = express();

  // Trust proxy for tests to get proper IP addresses
  app.set('trust proxy', true);

  app.use(helmet());
  // Restrict CORS to localhost for tests only
  app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000'],
    credentials: true
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(lusca.csrf());
  app.use('/api', routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
