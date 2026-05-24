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
}
