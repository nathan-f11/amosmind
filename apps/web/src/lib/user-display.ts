/**
 * 从 email 推导用户展示信息（当前无独立 name 字段）
 * @author Cursor AI
 */

/**
 * 取 Avatar 首字：admin@x.com → A
 */
export function getUserInitial(email: string): string {
  const local = email.trim().split('@')[0] ?? '';
  const first = local.charAt(0);
  if (!first) return '?';
  return first.toUpperCase();
}

/**
 * 展示用全名（现阶段即完整邮箱）
 */
export function getUserDisplayName(email: string): string {
  return email.trim() || '—';
}
