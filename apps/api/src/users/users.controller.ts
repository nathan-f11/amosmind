import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreditsService } from '../credits/credits.service';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly creditsService: CreditsService,
  ) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.usersService.getMe(user.id);
  }

  @Get('me/credits/ledger')
  creditLedger(
    @CurrentUser() user: AuthUser,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const parsedLimit = limit ? Number(limit) : undefined;
    return this.creditsService.findLedgerForUser(user.id, {
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
      cursor: cursor || undefined,
    });
  }
}
