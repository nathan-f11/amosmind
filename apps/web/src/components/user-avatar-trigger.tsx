'use client';

import { Avatar, Tooltip } from 'antd';
import type { UserMe } from '@/lib/api';
import { getUserDisplayName, getUserInitial } from '@/lib/user-display';

interface UserAvatarTriggerProps {
  user: UserMe | null;
  loading?: boolean;
}

/**
 * 用户 Avatar：展示邮箱首字，点击 Tooltip 显示完整邮箱与积分
 * @author Cursor AI
 */
export function UserAvatarTrigger({ user, loading }: UserAvatarTriggerProps) {
  if (loading || !user) {
    return (
      <Avatar
        size={32}
        className="!cursor-default !bg-zinc-700"
        style={{ verticalAlign: 'middle' }}
      >
        ?
      </Avatar>
    );
  }

  const initial = getUserInitial(user.email);
  const displayName = getUserDisplayName(user.email);

  return (
    <Tooltip
      trigger="click"
      title={
        <div className="text-center">
          <div className="font-medium">{displayName}</div>
          <div className="mt-1 text-xs opacity-80 tabular-nums">
            积分 {user.creditBalance.toLocaleString()}
          </div>
        </div>
      }
    >
      <Avatar
        size={32}
        className="!cursor-pointer"
        style={{
          verticalAlign: 'middle',
          background: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
          fontWeight: 600,
        }}
      >
        {initial}
      </Avatar>
    </Tooltip>
  );
}
