
import type { User } from '../types';

// Mock Firebase Auth Service
export const authService = {
  login: (email: string, pass: string): Promise<User> => {
    console.log(`Attempting login with ${email} and ${pass}`);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (pass === 'password') {
          const user: User = {
            uid: 'mock-user-123',
            email: email,
            displayName: email.split('@')[0],
          };
          resolve(user);
        } else {
          reject(new Error('Invalid credentials'));
        }
      }, 1000);
    });
  },

  logout: (): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 500);
    });
  },
};
