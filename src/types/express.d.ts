export {};

import "express";

declare global {
  namespace Express {
    interface User {
      id: string;
      _id?: string;
      phone?: string;
    }
    interface Request {
      user: User;
    }
  }
}
