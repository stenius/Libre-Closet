import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Put,
  Redirect,
  Render,
  UseGuards,
} from '@nestjs/common';
import { User as UserEntity } from '../dal/entity/user.entity';
import { ApiTokenGuard } from './api-token.guard';
import { AuthGuard } from './auth.guard';
import { Payload } from './dto/payload.dto';
import { BodyMeasurements, parseMeasurements } from './measurements';
import { User } from './user.decorator';

abstract class MeasurementsBase {
  constructor(protected readonly users: EntityRepository<UserEntity>) {}

  protected async read(user?: Payload): Promise<BodyMeasurements> {
    const entity = await this.find(user);
    return entity.measurements ?? {};
  }

  protected async write(
    user: Payload | undefined,
    body: Record<string, unknown>,
  ): Promise<BodyMeasurements> {
    const measurements = parseMeasurements(body);
    const entity = await this.find(user);
    entity.measurements = measurements;
    await this.users.getEntityManager().flush();
    return measurements;
  }

  /** Measurements belong to an account, so no-auth instances have none. */
  private async find(user?: Payload): Promise<UserEntity> {
    if (user?.userId == null) throw new NotFoundException();
    return this.users.findOneOrFail({ id: user.userId });
  }
}

@UseGuards(AuthGuard)
@Controller('auth/measurements')
export class MeasurementsController extends MeasurementsBase {
  constructor(
    @InjectRepository(UserEntity) users: EntityRepository<UserEntity>,
  ) {
    super(users);
  }

  @Get()
  @Render('auth/measurements')
  async page(@User() user: Payload) {
    return { measurements: await this.read(user) };
  }

  @Post()
  @Redirect('/auth/measurements', 302)
  async save(
    @User() user: Payload,
    @Body() body: Record<string, unknown>,
  ): Promise<void> {
    await this.write(user, body);
  }
}

@UseGuards(ApiTokenGuard)
@Controller('api/v1/measurements')
export class ApiMeasurementsController extends MeasurementsBase {
  constructor(
    @InjectRepository(UserEntity) users: EntityRepository<UserEntity>,
  ) {
    super(users);
  }

  @Get()
  get(@User() user?: Payload) {
    return this.read(user);
  }

  @Put()
  put(@User() user: Payload, @Body() body: Record<string, unknown>) {
    return this.write(user, body);
  }
}
