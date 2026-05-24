import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CreditsService {
  constructor(private readonly prisma: PrismaService) {}

  getGenerationCost(): number {
    return Number(process.env.GENERATION_COST ?? 10);
  }

  async chargeForTask(
    tx: Prisma.TransactionClient,
    userId: string,
    taskId: string,
    amount?: number,
  ) {
    const cost = amount ?? this.getGenerationCost();
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user || user.creditBalance < cost) {
      throw new HttpException(
        { message: '积分不足', code: 'INSUFFICIENT_CREDITS' },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
    await tx.creditLedger.create({
      data: {
        userId,
        taskId,
        amount: -cost,
        reason: 'generation',
      },
    });
    await tx.user.update({
      where: { id: userId },
      data: { creditBalance: { decrement: cost } },
    });
    return cost;
  }

  /**
   * 分页查询用户积分流水（按创建时间倒序）
   * @author Cursor AI
   */
  async findLedgerForUser(
    userId: string,
    options: { limit?: number; cursor?: string } = {},
  ) {
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);

    const rows = await this.prisma.creditLedger.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(options.cursor
        ? {
            cursor: { id: options.cursor },
            skip: 1,
          }
        : {}),
      include: {
        task: {
          select: {
            type: true,
            status: true,
            prompt: true,
          },
        },
      },
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    return {
      items: items.map(row => ({
        id: row.id,
        amount: row.amount,
        reason: row.reason,
        taskId: row.taskId,
        createdAt: row.createdAt.toISOString(),
        task: row.task ?? undefined,
      })),
      nextCursor: hasMore ? items[items.length - 1].id : null,
    };
  }
}
