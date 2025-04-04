import { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import jwtConfig from 'src/config/jwt.config';
import { JwtPayload } from 'src/types/jwtpayload';
import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(jwtConfig.KEY)
    private jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {
    const secret = jwtConfiguration.secret;

    if (typeof secret !== 'string') {
      throw new Error('JWT secret must be a string and is required');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
    });
  }

  validate(payload: JwtPayload) {
    // Validate required token structure first
    this.validateTokenStructure(payload);

    // Check if feature usage has been exceeded
    if (payload.featureUsageExceeded === true) {
      throw new ForbiddenException(
        'You do not have enough monthly request credits for this operation',
      );
    }

    // Convert JWT exp timestamp to a Date object
    const tokenExpiration = new Date(payload.exp * 1000);
    const now = new Date();

    // Check if token is about to expire (within 1 hour)
    if (tokenExpiration.getTime() - now.getTime() < 3600000) {
      console.warn(`JWT token is about to expire for user ${payload.userId}`);
    }
    return {
      id: payload.userId,
      companyId: payload.companyId,
      featureUsageExceeded: payload.featureUsageExceeded,
      featureAllocation: payload.featureAllocation,
      featureUsage: payload.featureUsage,
      featureUsagePeriod: payload.featureUsagePeriod,
      featureUsageResetAt: payload.featureUsageResetAt,
      flag: payload.flag,
      flagId: payload.flagId,
      reason: payload.reason,
      ruleId: payload.ruleId,
      ruleType: payload.ruleType,
      value: payload.value,
      exp: payload.exp,
    };
  }

  private validateTokenStructure(
    payload: JwtPayload,
  ): asserts payload is JwtPayload {
    // Check for required fields with proper types
    const requiredFields = [
      { name: 'userId', type: 'string' },
      { name: 'companyId', type: 'string' },
      { name: 'featureUsageExceeded', type: 'boolean' },
      { name: 'featureAllocation', type: 'number' },
      { name: 'featureUsage', type: 'number' },
      { name: 'featureUsagePeriod', type: 'string' },
      { name: 'featureUsageResetAt', type: 'string' },
      { name: 'flag', type: 'string' },
      { name: 'flagId', type: 'string' },
      { name: 'exp', type: 'number' },
    ];

    for (const field of requiredFields) {
      if (
        payload[field.name] === undefined ||
        typeof payload[field.name] !== field.type
      ) {
        throw new UnauthorizedException(`Invalid token structure`);
      }
    }

    // Validate expiration timestamp
    if (payload.exp * 1000 < Date.now()) {
      throw new UnauthorizedException('Token has expired');
    }

    try {
      const resetDate = new Date(payload.featureUsageResetAt);
      if (isNaN(resetDate.getTime())) {
        throw new UnauthorizedException('Invalid reset date format in token');
      }
    } catch {
      throw new UnauthorizedException('Invalid reset date format in token');
    }
  }
}
