/**
 * JWT Authentication Pattern for Express
 * Production-tested implementation with refresh tokens
 */

export const pattern = {
  id: 'auth-jwt-express',
  name: 'JWT Authentication for Express',
  category: 'auth',
  description: 'Complete JWT authentication with refresh tokens, middleware, and user management',
  tags: ['authentication', 'jwt', 'express', 'security'],
  
  code: `
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';

// Configuration
const config = {
  accessTokenSecret: process.env.JWT_ACCESS_SECRET || 'your-access-secret',
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
  bcryptRounds: 10
};

// Types
interface User {
  id: string;
  email: string;
  password: string;
  role?: string;
}

interface TokenPayload {
  userId: string;
  email: string;
  role?: string;
}

interface AuthRequest extends Request {
  user?: TokenPayload;
}

// Token generation
export const generateTokens = (user: User) => {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };

  const accessToken = jwt.sign(payload, config.accessTokenSecret, {
    expiresIn: config.accessTokenExpiry
  });

  const refreshToken = jwt.sign(payload, config.refreshTokenSecret, {
    expiresIn: config.refreshTokenExpiry
  });

  return { accessToken, refreshToken };
};

// Password hashing
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, config.bcryptRounds);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// Authentication middleware
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1]; // Bearer <token>

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, config.accessTokenSecret) as TokenPayload;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Role-based authorization
export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (roles.length && !roles.includes(req.user.role || '')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Refresh token handler
export const refreshTokenHandler = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, config.refreshTokenSecret) as TokenPayload;
    
    // In production, verify the refresh token exists in database
    // and hasn't been revoked
    
    const newTokens = generateTokens({
      id: decoded.userId,
      email: decoded.email,
      password: '', // Not needed for token generation
      role: decoded.role
    });

    res.json(newTokens);
  } catch (error) {
    return res.status(403).json({ error: 'Invalid refresh token' });
  }
};

// Login handler
export const loginHandler = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // In production, fetch user from database
    const user = await findUserByEmail(email);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await verifyPassword(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const tokens = generateTokens(user);
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      ...tokens
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
};

// Register handler
export const registerHandler = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Check if user exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    const user = await createUser({
      email,
      password: hashedPassword
    });

    const tokens = generateTokens(user);

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email
      },
      ...tokens
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
};

// Logout handler (for token blacklisting)
export const logoutHandler = async (req: AuthRequest, res: Response) => {
  try {
    // In production, add the token to a blacklist in Redis/database
    // with expiry matching the token expiry
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
};

// Placeholder database functions - replace with your ORM
async function findUserByEmail(email: string): Promise<User | null> {
  // Replace with actual database query
  throw new Error('Implement findUserByEmail with your database');
}

async function createUser(data: { email: string; password: string }): Promise<User> {
  // Replace with actual database query
  throw new Error('Implement createUser with your database');
}

// Express route setup
export function setupAuthRoutes(app: any) {
  app.post('/auth/register', registerHandler);
  app.post('/auth/login', loginHandler);
  app.post('/auth/refresh', refreshTokenHandler);
  app.post('/auth/logout', authenticate, logoutHandler);
  
  // Protected route example
  app.get('/auth/me', authenticate, (req: AuthRequest, res: Response) => {
    res.json({ user: req.user });
  });
  
  // Admin-only route example
  app.get('/admin/users', authenticate, authorize('admin'), (req: Request, res: Response) => {
    res.json({ message: 'Admin access granted' });
  });
}
`,

  dependencies: {
    'jsonwebtoken': '^9.0.0',
    'bcryptjs': '^2.4.3',
    '@types/jsonwebtoken': '^9.0.0',
    '@types/bcryptjs': '^2.4.2'
  },

  customization: {
    variables: [
      {
        name: 'accessTokenExpiry',
        type: 'string',
        description: 'Access token expiration time',
        defaultValue: '15m'
      },
      {
        name: 'refreshTokenExpiry',
        type: 'string',
        description: 'Refresh token expiration time',
        defaultValue: '7d'
      },
      {
        name: 'bcryptRounds',
        type: 'number',
        description: 'Bcrypt hashing rounds',
        defaultValue: '10'
      }
    ],
    
    injectionPoints: [
      {
        id: 'after-login-success',
        description: 'Add custom logic after successful login',
        type: 'after' as const,
        location: 'function:loginHandler'
      },
      {
        id: 'before-token-generation',
        description: 'Add custom claims to JWT tokens',
        type: 'before' as const,
        location: 'function:generateTokens'
      }
    ],
    
    patterns: [
      {
        type: 'naming',
        current: 'camelCase',
        description: 'Variable and function naming convention'
      },
      {
        type: 'error-handling',
        current: 'try-catch',
        description: 'Error handling approach'
      },
      {
        type: 'async-pattern',
        current: 'async-await',
        description: 'Asynchronous code pattern'
      }
    ]
  }
};
