// @ts-nocheck -- ported from the original OmniMarket repo (looser TS config)
import {
  BrandProfile,
  CampaignCreative,
  ChannelPerformanceData,
  CompetitorData,
  ScheduledPost,
  UserProfile,
  UserWorkspaceData,
} from "../types";

const STORAGE_KEY_SESSION = "omnimarket_active_session_v1";
const STORAGE_KEY_USERS = "omnimarket_registered_users_v1";
const STORAGE_KEY_PREFIX_WORKSPACE = "omnimarket_workspace_";

// In-memory memory store as reliable fallback (e.g. if localStorage is blocked)
const memoryStore: Record<string, string> = {};

function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch (err) {
    console.warn("localStorage read warning:", err);
  }
  return memoryStore[key] || null;
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch (err) {
    console.warn("localStorage write warning:", err);
  }
  memoryStore[key] = value;
}

function safeRemoveItem(key: string): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch (err) {
    console.warn("localStorage remove warning:", err);
  }
  delete memoryStore[key];
}

/**
 * Retrieve all registered users stored locally
 */
export function getRegisteredUsers(): UserProfile[] {
  const raw = safeGetItem(STORAGE_KEY_USERS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Find user by email (case-insensitive)
 */
export function findUserByEmail(email: string): UserProfile | null {
  const users = getRegisteredUsers();
  const normalized = email.trim().toLowerCase();
  return users.find((u) => u.email.trim().toLowerCase() === normalized) || null;
}

/**
 * Register a new user or update last login of existing user
 */
export function registerOrUpdateUser(
  name: string,
  email: string,
  company?: string,
  role?: string,
): { user: UserProfile; isNew: boolean } {
  const users = getRegisteredUsers();
  const normalized = email.trim().toLowerCase();
  const existingIndex = users.findIndex((u) => u.email.trim().toLowerCase() === normalized);

  const now = new Date().toISOString();

  if (existingIndex >= 0) {
    const updatedUser: UserProfile = {
      ...users[existingIndex],
      name: name.trim() || users[existingIndex].name,
      company: company?.trim() || users[existingIndex].company,
      role: role?.trim() || users[existingIndex].role,
      lastLoginAt: now,
    };
    users[existingIndex] = updatedUser;
    safeSetItem(STORAGE_KEY_USERS, JSON.stringify(users));
    setCurrentSession(updatedUser);
    return { user: updatedUser, isNew: false };
  }

  const newUser: UserProfile = {
    id: "usr_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    name: name.trim() || email.split("@")[0],
    email: normalized,
    company: company?.trim() || "Minha Empresa",
    role: role?.trim() || "Gestor de Marketing",
    createdAt: now,
    lastLoginAt: now,
  };

  users.push(newUser);
  safeSetItem(STORAGE_KEY_USERS, JSON.stringify(users));
  setCurrentSession(newUser);
  return { user: newUser, isNew: true };
}

/**
 * Authenticate existing user by email
 */
export function loginUser(email: string): UserProfile | null {
  const existing = findUserByEmail(email);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updatedUser: UserProfile = {
    ...existing,
    lastLoginAt: now,
  };

  const users = getRegisteredUsers().map((u) => (u.id === existing.id ? updatedUser : u));
  safeSetItem(STORAGE_KEY_USERS, JSON.stringify(users));
  setCurrentSession(updatedUser);
  return updatedUser;
}

/**
 * Get active authenticated user session
 */
export function getCurrentSession(): UserProfile | null {
  const raw = safeGetItem(STORAGE_KEY_SESSION);
  if (!raw) return null;
  try {
    const user = JSON.parse(raw) as UserProfile;
    if (user && user.id && user.email) {
      return user;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Set active authenticated user session
 */
export function setCurrentSession(user: UserProfile): void {
  safeSetItem(STORAGE_KEY_SESSION, JSON.stringify(user));
}

/**
 * Terminate current user session (keeps user accounts and workspace data preserved)
 */
export function clearCurrentSession(): void {
  safeRemoveItem(STORAGE_KEY_SESSION);
}

/**
 * Load workspace data for a given user ID
 */
export function loadUserWorkspace(userId: string): UserWorkspaceData | null {
  const raw = safeGetItem(STORAGE_KEY_PREFIX_WORKSPACE + userId);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Save complete workspace data for a given user
 */
export function saveUserWorkspace(data: UserWorkspaceData): void {
  if (!data?.user?.id) return;
  const key = STORAGE_KEY_PREFIX_WORKSPACE + data.user.id;
  const payload = {
    ...data,
    updatedAt: new Date().toISOString(),
  };
  safeSetItem(key, JSON.stringify(payload));

  // Asynchronously mirror to server persistence if in browser
  if (typeof window !== "undefined" && typeof fetch !== "undefined") {
    fetch("/api/workspace/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {
      // Local copy is primary; ignore server mirror errors
    });
  }
}
