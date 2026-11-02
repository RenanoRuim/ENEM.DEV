declare global {
  namespace Express {
    interface Request {
      userId?: string;
      accessToken?: string;
    }
  }
}

export {};
