'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useAuth } from '@/context/auth-context';
import { listCreditLedger, type CreditLedgerItem } from '@/lib/api';
import { cn } from '@/lib/utils';

const REASON_LABELS: Record<string, string> = {
  generation: '生成任务扣费',
};

const TASK_TYPE_LABELS: Record<string, string> = {
  text2img: '文生图',
  img2prompt: '反推提示词',
  resize: '图片改比例',
};

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function formatDescription(item: CreditLedgerItem): string {
  const reason = REASON_LABELS[item.reason] ?? item.reason;
  if (!item.task) return reason;
  const typeLabel = TASK_TYPE_LABELS[item.task.type] ?? item.task.type;
  return `${reason} · ${typeLabel}`;
}

/**
 * 积分流水页
 * @author Cursor AI
 */
export default function CreditsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<CreditLedgerItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLedger = useCallback(async (cursor?: string) => {
    const isLoadMore = Boolean(cursor);
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await listCreditLedger({ limit: 20, cursor });
      setItems(prev => (isLoadMore ? [...prev, ...res.items] : res.items));
      setNextCursor(res.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void loadLedger();
  }, [loadLedger]);

  const columns: ColumnsType<CreditLedgerItem> = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (value: string) => (
        <span className="tabular-nums text-zinc-300">{formatDateTime(value)}</span>
      ),
    },
    {
      title: '变动',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      render: (value: number) => (
        <span
          className={cn(
            'font-medium tabular-nums',
            value > 0 ? 'text-emerald-400' : 'text-red-400',
          )}
        >
          {value > 0 ? `+${value}` : value}
        </span>
      ),
    },
    {
      title: '说明',
      key: 'description',
      render: (_, record) => (
        <span className="text-zinc-300">{formatDescription(record)}</span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">积分流水</h1>
          <p className="mt-2 text-sm text-zinc-500">查看积分变动记录</p>
        </div>
        <div className="flex items-center gap-3">
          <Tag bordered={false} className="!m-0 !rounded-full !px-3 !py-1 !text-zinc-200">
            当前余额 {user ? user.creditBalance.toLocaleString() : '—'}
          </Tag>
          <Link
            href="/"
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200"
          >
            去创作
          </Link>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={items}
          loading={loading}
          pagination={false}
          locale={{
            emptyText: '暂无流水记录，去首页生成任务后会在此显示',
          }}
          className="[&_.ant-table]:!bg-transparent [&_.ant-table-thead>tr>th]:!bg-zinc-900/80 [&_.ant-table-thead>tr>th]:!text-zinc-400 [&_.ant-table-tbody>tr>td]:!border-zinc-800"
        />
      </div>

      {nextCursor && (
        <div className="mt-4 flex justify-center">
          <Button loading={loadingMore} onClick={() => void loadLedger(nextCursor)}>
            加载更多
          </Button>
        </div>
      )}
    </div>
  );
}
