import crypto from 'crypto';
import { childLogger } from '../utils/logger.js';

const requestIdMiddleware = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || `req_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  req.requestId = requestId;
  req.log = childLogger(requestId);
  res.setHeader('X-Request-Id', requestId);
  next();
};

export default requestIdMiddleware;
