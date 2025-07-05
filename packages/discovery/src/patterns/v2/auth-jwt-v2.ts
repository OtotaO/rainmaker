/**
 * JWT Authentication Pattern V2
 * 
 * A complete, working authentication module that adapts through configuration,
 * not code transformation. Following Carmack's principle: make it work, make it simple.
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { PatternV2, PatternModule, PatternConfig, AppContext } from '../pattern-v2';

interface AuthConfig extends PatternConfig {
  accessTokenSecret: string;
  refreshTokenSecret: string;
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
  bcryptRounds: number;
  tokenPrefix: string;
}

interface AuthRequest extends Request {
  user?: TokenPayload;
}

interface TokenPayload {
  userId: string;
  email: string;
  role?: string;
}

interface User {
  id: string;
  email: string;
  password: string;
  role?: string;
}

class JWTAuthModule implements PatternModule {
  private config: AuthConfig;
  private context!: AppContext;
  private userStore: Map<string, User> = new Map(); // In-memory for demo
  
  constructor(config: AuthConfig) {
    this.config = config;
  }
  
  async initialize(context: AppContext): Promise<void> {
    this.context = context;
    context.logger.info('JWT Auth module initialized', {
      accessTokenExpiry: this.config.accessTokenExpiry,
      tokenPrefix: this.config.tokenPrefix
    });
  }
  
  // Public API exposed to other patterns
  api = {
    generateTokens: this.generateTokens.bind(this),
    verifyToken: this.verifyToken.bind(this),
    hashPassword: this.hashPassword.bind(this),
    verifyPassword: this.verifyPassword.bind(this),
    createUser: this.createUser.bind(this),
    findUserByEmail: this.findUserByEmail.bind(this),
    authenticate: this.authenticate.bind(this),
    authorize: this.authorize.bind(this)
  };
  
  // Express middleware
  middleware = [
    this.authenticate.bind(this)
  ];
  
  // Route definitions
  routes = [
    {
      method: 'POST' as const,
      path: '/auth/register',
      handler: this.registerHandler.bind(this)
    },
    {
      method: 'POST' as const,
      path: '/auth/login',
      handler: this.loginHandler.bind(this)
    },
    {
      method: 'POST' as const,
      path: '/auth/refresh',
      handler: this.refreshHandler.bind(this)
    },
    {
      method: 'POST' as const,
      path: '/auth/logout',
      handler: this.logoutHandler.bind(this),
      middleware: [this.authenticate.bind(this)]
    },
    {
      method: 'GET' as const,
      path: '/auth/me',
      handler: this.meHandler.bind(this),
      middleware: [this.authenticate.bind(this)]
    }
  ];
  
  // Core functionality
  private generateTokens(user: User) {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };
    
    const accessToken = jwt.sign(payload, this.config.accessTokenSecret, {
      expiresIn: this.config.accessTokenExpiry
    });
    
    const refreshToken = jwt.sign(payload, this.config.refreshTokenSecret, {
      expiresIn: this.config.refreshTokenExpiry
    });
    
    return {
      accessToken: `${this.config.tokenPrefix}${accessToken}`,
      refreshToken: `${this.config.tokenPrefix}${refreshToken}`
    };
  }
  
  private verifyToken(token: string, isRefresh = false): TokenPayload | null {
    try {
      // Remove prefix if present
      if (token.startsWith(this.config.tokenPrefix)) {
        token = token.slice(this.config.tokenPrefix.length);
      }
      
      const secret = isRefresh ? this.config.refreshTokenSecret : this.config.accessTokenSecret;
      return jwt.verify(token, secret) as TokenPayload;
    } catch (error) {
      return null;
    }
  }
  
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.config.bcryptRounds);
  }
  
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
  
  private async createUser(email: string, password: string, role?: string): Promise<User> {
    const user: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email,
      password: await this.hashPassword(password),
      role
    };
    this.userStore.set(email, user);
    return user;
  }
  
  private async findUserByEmail(email: string): Promise<User | null> {
    return this.userStore.get(email) || null;
  }
  
  // Middleware
  private authenticate(req: AuthRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const payload = this.verifyToken(token);
    if (!payload) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    
    req.user = payload;
    next();
  }
  
  private authorize(...roles: string[]) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      if (roles.length && !roles.includes(req.user.role || '')) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      
      next();
    };
  }
  
  // Route handlers
  private async registerHandler(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }
      
      const existing = await this.findUserByEmail(email);
      if (existing) {
        return res.status(409).json({ error: 'User already exists' });
      }
      
      const user = await this.createUser(email, password);
      const tokens = this.generateTokens(user);
      
      res.status(201).json({
        user: { id: user.id, email: user.email },
        ...tokens
      });
    } catch (error) {
      this.context.logger.error('Registration failed', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
  
  private async loginHandler(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      
      const user = await this.findUserByEmail(email);
      if (!user || !(await this.verifyPassword(password, user.password))) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      const tokens = this.generateTokens(user);
      
      res.json({
        user: { id: user.id, email: user.email, role: user.role },
        ...tokens
      });
    } catch (error) {
      this.context.logger.error('Login failed', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
  
  private async refreshHandler(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token required' });
      }
      
      const payload = this.verifyToken(refreshToken, true);
      if (!payload) {
        return res.status(403).json({ error: 'Invalid refresh token' });
      }
      
      // Generate new tokens
      const user: User = {
        id: payload.userId,
        email: payload.email,
        password: '', // Not needed for token generation
        role: payload.role
      };
      
      const tokens = this.generateTokens(user);
      res.json(tokens);
    } catch (error) {
      this.context.logger.error('Token refresh failed', error);
      res.status(500).json({ error: 'Token refresh failed' });
    }
  }
  
  private async logoutHandler(req: AuthRequest, res: Response) {
    // In a real implementation, you'd blacklist the token
    res.json({ message: 'Logged out successfully' });
  }
  
  private async meHandler(req: AuthRequest, res: Response) {
    res.json({ user: req.user });
  }
}

// Pattern definition
export const authJwtV2: PatternV2 = {
  id: 'auth-jwt-v2',
  name: 'JWT Authentication V2',
  description: 'Configuration-driven JWT authentication with zero code generation',
  
  factory: (config: PatternConfig) => new JWTAuthModule(config as AuthConfig),
  
  configSchema: {
    required: {
      accessTokenSecret: {
        type: 'string',
        description: 'Secret for signing access tokens',
        validation: (v) => typeof v === 'string' && v.length >= 32
      },
      refreshTokenSecret: {
        type: 'string',
        description: 'Secret for signing refresh tokens',
        validation: (v) => typeof v === 'string' && v.length >= 32
      }
    },
    optional: {
      accessTokenExpiry: {
        type: 'string',
        description: 'Access token expiration (e.g., "15m")',
        default: '15m'
      },
      refreshTokenExpiry: {
        type: 'string',
        description: 'Refresh token expiration (e.g., "7d")',
        default: '7d'
      },
      bcryptRounds: {
        type: 'number',
        description: 'Bcrypt hashing rounds',
        default: 10,
        validation: (v) => typeof v === 'number' && v >= 8 && v <= 15
      },
      tokenPrefix: {
        type: 'string',
        description: 'Prefix for tokens (e.g., "Bearer ")',
        default: ''
      }
    }
  },
  
  dependencies: {
    npm: {
      'jsonwebtoken': '^9.0.0',
      'bcryptjs': '^2.4.3',
      '@types/jsonwebtoken': '^9.0.0',
      '@types/bcryptjs': '^2.4.2'
    },
    patterns: []
  },
  
  examples: [
    {
      name: 'Basic JWT Auth',
      description: 'Simple JWT authentication setup',
      config: {
        accessTokenSecret: process.env.JWT_ACCESS_SECRET || 'your-32-char-access-secret-here!',
        refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'your-32-char-refresh-secret-here!',
        accessTokenExpiry: '15m',
        refreshTokenExpiry: '7d',
        bcryptRounds: 10
      },
      usage: `
// In your app composition:
const auth = app.instances.get('auth');

// Use the API directly
const user = await auth.api.createUser('user@example.com', 'password123');
const tokens = auth.api.generateTokens(user);

// Or use the routes with Express
app.use(auth.routes);
      `
    }
  ]
};
