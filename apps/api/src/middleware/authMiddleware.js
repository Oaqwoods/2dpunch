import { userRepository } from '../repositories/userRepository.js';

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  const token = authHeader.slice('Bearer '.length);
  const session = await userRepository.getSession(token);

  if (!session) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  const user = await userRepository.findUserById(session.userId);
  if (!user) {
    return res.status(401).json({ error: 'Session user not found' });
  }

  req.auth = {
    token,
    user
  };

  return next();
}