import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import routes from '../../src/routes';
import { errorHandler, notFoundHandler } from '../../src/middleware/error.middleware';

export const createTestApp = (): Application => {
  const app = express();

  // Trust proxy for tests to get proper IP addresses
  app.set('trust proxy', true);

  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use('/api', routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
