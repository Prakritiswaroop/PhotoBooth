import { useState, useEffect } from 'react';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if there is an active session
    const activeSession = localStorage.getItem('vintage_booth_session');
    if (activeSession) {
      try {
        setUser(JSON.parse(activeSession));
      } catch (e) {
        localStorage.removeItem('vintage_booth_session');
      }
    }
    setLoading(false);
  }, []);

  const login = (email, password) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const usersStr = localStorage.getItem('vintage_booth_users') || '[]';
        const users = JSON.parse(usersStr);
        
        const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        
        if (!existingUser) {
          reject(new Error('User not found. Please register first!'));
          return;
        }
        
        if (existingUser.password !== password) {
          reject(new Error('Invalid password. Try again!'));
          return;
        }

        const sessionUser = {
          email: existingUser.email,
          displayName: existingUser.displayName || email.split('@')[0],
          photoURL: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${existingUser.email}`,
          uid: existingUser.uid
        };

        localStorage.setItem('vintage_booth_session', JSON.stringify(sessionUser));
        setUser(sessionUser);
        resolve(sessionUser);
      }, 800); // simulate network lag
    });
  };

  const register = (email, password, displayName) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const usersStr = localStorage.getItem('vintage_booth_users') || '[]';
        const users = JSON.parse(usersStr);

        const emailExists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
        if (emailExists) {
          reject(new Error('Email already registered!'));
          return;
        }

        const newUser = {
          uid: 'uid_' + Math.random().toString(36).substr(2, 9),
          email,
          password,
          displayName: displayName || email.split('@')[0]
        };

        users.push(newUser);
        localStorage.setItem('vintage_booth_users', JSON.stringify(users));

        const sessionUser = {
          email: newUser.email,
          displayName: newUser.displayName,
          photoURL: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${newUser.email}`,
          uid: newUser.uid
        };

        localStorage.setItem('vintage_booth_session', JSON.stringify(sessionUser));
        setUser(sessionUser);
        resolve(sessionUser);
      }, 800);
    });
  };

  const loginWithGoogle = () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockGoogleUser = {
          uid: 'google_1092837465',
          email: 'swarop@vintagebooth.com',
          displayName: 'Swarop',
          photoURL: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=swarop',
          isGoogle: true
        };

        localStorage.setItem('vintage_booth_session', JSON.stringify(mockGoogleUser));
        setUser(mockGoogleUser);
        resolve(mockGoogleUser);
      }, 600);
    });
  };

  const logout = () => {
    localStorage.removeItem('vintage_booth_session');
    setUser(null);
  };

  return {
    user,
    loading,
    login,
    register,
    loginWithGoogle,
    logout
  };
}
