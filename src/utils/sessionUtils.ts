// Utility functions for managing anonymous sessions

export function generateSessionId(): string {
  return `anon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getOrCreateSessionId(): string {
  const storageKey = 'anonymous-session-id';
  let sessionId = localStorage.getItem(storageKey);
  
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem(storageKey, sessionId);
  }
  
  return sessionId;
}

export function clearSessionId(): void {
  localStorage.removeItem('anonymous-session-id');
}

export function getSessionMessageCount(): number {
  const count = localStorage.getItem('anonymous-message-count');
  return count ? parseInt(count, 10) : 0;
}

export function incrementSessionMessageCount(): number {
  const current = getSessionMessageCount();
  const newCount = current + 1;
  localStorage.setItem('anonymous-message-count', newCount.toString());
  return newCount;
}

export function clearSessionMessageCount(): void {
  localStorage.removeItem('anonymous-message-count');
}