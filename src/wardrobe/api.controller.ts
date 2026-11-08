import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { ApiTokenGuard } from '../auth/api-token.guard';
import { Payload } from '../auth/dto/payload.dto';
import { OutfitSlot } from '../dal/entity/outfit.entity';
import {
  serializeCalendarEntry,
  serializeGarment,
  serializeGarmentPhoto,
  serializeOutfit,
} from './api.serializers';
import { CalendarService } from './calendar.service';
import {
  Json,
  optionalString,
  parseDate,
  parseGarmentBody,
} from './api.parsers';
import { GarmentColor } from './garment-color.enum';
import { parsePhotoLabel } from './garment-attributes';
import { GarmentService } from './garment.service';
import { OutfitService } from './outfit.service';
import { WearService } from './wear.service';

@UseGuards(ApiTokenGuard)
@Controller('api/v1')
export class ApiController {
  constructor(
    private readonly garmentService: GarmentService,
    private readonly outfitService: OutfitService,
    private readonly calendarService: CalendarService,
    private readonly wearService: WearService,
  ) {}

  private userId(req: FastifyRequest): number | undefined {
    return (req['user'] as Payload | undefined)?.userId;
  }

  /** Builds outfit slots, rejecting garments the caller doesn't own. */
  private async slotsFor(
    garmentIds: unknown,
    userId?: number,
  ): Promise<OutfitSlot[]> {
    if (
      !Array.isArray(garmentIds) ||
      !garmentIds.every((id) => Number.isInteger(id))
    ) {
      throw new BadRequestException('garmentIds must be a list of ids');
    }
    const garments = await Promise.all(
      (garmentIds as number[]).map((id) =>
        this.garmentService.findOne(id, userId),
      ),
    );
    return garments.map((g) => ({ category: g.category, garmentId: g.id }));
  }

  // --- garments ----------------------------------------------------------

  @Get('garments')
  async listGarments(
    @Req() req: FastifyRequest,
    @Query()
    query: {
      keyword?: string;
      category?: string;
      color?: GarmentColor;
      size?: string;
      archived?: string;
      layer?: string;
      condition?: string;
      waterResistance?: string;
      warmthAt?: string;
    },
  ) {
    let warmthAt: number | undefined;
    if (query.warmthAt !== undefined) {
      warmthAt = Number(query.warmthAt);
      if (!Number.isInteger(warmthAt)) {
        throw new BadRequestException('warmthAt must be a whole number');
      }
    }
    const garments = await this.garmentService.findAll(this.userId(req), {
      ...query,
      warmthAt,
    });
    return garments.map(serializeGarment);
  }

  @Get('garments/filters')
  async filters(@Req() req: FastifyRequest) {
    return {
      ...(await this.garmentService.findAvailableFilters(this.userId(req))),
      colors: Object.values(GarmentColor),
    };
  }

  @Get('garments/:id')
  async getGarment(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
  ) {
    const userId = this.userId(req);
    return serializeGarment(await this.garmentService.findOne(id, userId));
  }

  @Post('garments')
  async createGarment(@Body() body: Json, @Req() req: FastifyRequest) {
    const dto = parseGarmentBody(body ?? {});
    if (!dto['category']) {
      throw new BadRequestException('category is required');
    }
    const garment = await this.garmentService.create(
      dto as any,
      this.userId(req),
    );
    return serializeGarment(garment);
  }

  @Patch('garments/:id')
  async updateGarment(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Json,
    @Req() req: FastifyRequest,
  ) {
    const userId = this.userId(req);
    const garment = await this.garmentService.update(
      id,
      parseGarmentBody(body ?? {}) as any,
      userId,
      userId,
    );
    return serializeGarment(garment);
  }

  @Put('garments/:id/archived')
  async setArchived(
    @Param('id', ParseIntPipe) id: number,
    @Body('archived') archived: unknown,
    @Req() req: FastifyRequest,
  ) {
    if (typeof archived !== 'boolean') {
      throw new BadRequestException('archived must be true or false');
    }
    const userId = this.userId(req);
    let garment = await this.garmentService.findOne(id, userId);
    if (garment.archived !== archived) {
      garment = await this.garmentService.archive(id, userId);
    }
    return serializeGarment(garment);
  }

  @Post('garments/:id/photo')
  async uploadPhoto(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
  ) {
    const userId = this.userId(req);
    const garment = await this.garmentService.update(
      id,
      { files: (req as any).files({ limits: { files: 2 } }) },
      userId,
      userId,
    );
    return serializeGarment(garment);
  }

  @Get('garments/:id/photos')
  async listPhotos(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
  ) {
    const photos = await this.garmentService.listPhotos(id, this.userId(req));
    return photos.map(serializeGarmentPhoto);
  }

  @Post('garments/:id/photos')
  async addPhoto(
    @Param('id', ParseIntPipe) id: number,
    @Query('label') label: unknown,
    @Req() req: FastifyRequest,
  ) {
    const photo = await this.garmentService.addPhoto(
      id,
      () => (req as any).files({ limits: { files: 1 } }),
      parsePhotoLabel(label),
      this.userId(req),
    );
    return serializeGarmentPhoto(photo);
  }

  @Delete('garments/:id/photos/:photoId')
  @HttpCode(204)
  async deletePhoto(
    @Param('id', ParseIntPipe) id: number,
    @Param('photoId', ParseIntPipe) photoId: number,
    @Req() req: FastifyRequest,
  ) {
    await this.garmentService.removePhoto(id, photoId, this.userId(req));
  }

  @Get('wear-stats')
  wearStats(
    @Query('archived') archived: string | undefined,
    @Req() req: FastifyRequest,
  ) {
    return this.wearService.stats(this.userId(req), archived === 'true');
  }

  @Get('garments/:id/wears')
  async listWears(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
  ) {
    const wears = await this.wearService.list(id, this.userId(req));
    return wears.map((wear) => ({ id: wear.id, date: wear.wornOn }));
  }

  @Post('garments/:id/wears')
  async logWear(
    @Param('id', ParseIntPipe) id: number,
    @Body('date') date: unknown,
    @Req() req: FastifyRequest,
  ) {
    parseDate('date', date);
    const wear = await this.wearService.log(
      id,
      date as string,
      this.userId(req),
    );
    return { id: wear.id, date: wear.wornOn };
  }

  @Delete('garments/:id/wears/:wearId')
  @HttpCode(204)
  async deleteWear(
    @Param('id', ParseIntPipe) id: number,
    @Param('wearId', ParseIntPipe) wearId: number,
    @Req() req: FastifyRequest,
  ) {
    await this.wearService.remove(id, wearId, this.userId(req));
  }

  @Delete('garments/:id')
  @HttpCode(204)
  async deleteGarment(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
  ) {
    await this.garmentService.remove(id, this.userId(req));
  }

  // --- outfits -----------------------------------------------------------

  @Get('outfits')
  async listOutfits(@Req() req: FastifyRequest) {
    const outfits = await this.outfitService.findAll(this.userId(req));
    return outfits.map(serializeOutfit);
  }

  @Get('outfits/:id')
  async getOutfit(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
  ) {
    return serializeOutfit(
      await this.outfitService.findOne(id, this.userId(req)),
    );
  }

  @Post('outfits')
  async createOutfit(@Body() body: Json, @Req() req: FastifyRequest) {
    const userId = this.userId(req);
    const created = await this.outfitService.create(
      {
        name: optionalString('name', body?.name ?? ''),
        notes: optionalString('notes', body?.notes ?? ''),
        slots: await this.slotsFor(body?.garmentIds ?? [], userId),
      },
      userId,
    );
    return serializeOutfit(
      await this.outfitService.findOne(created.id, userId),
    );
  }

  @Patch('outfits/:id')
  async updateOutfit(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Json,
    @Req() req: FastifyRequest,
  ) {
    const userId = this.userId(req);
    await this.outfitService.update(
      id,
      {
        ...(body?.name !== undefined
          ? { name: optionalString('name', body.name) }
          : {}),
        ...(body?.notes !== undefined
          ? { notes: optionalString('notes', body.notes) }
          : {}),
        ...(body?.garmentIds !== undefined
          ? { slots: await this.slotsFor(body.garmentIds, userId) }
          : {}),
      },
      userId,
    );
    return serializeOutfit(await this.outfitService.findOne(id, userId));
  }

  @Delete('outfits/:id')
  @HttpCode(204)
  async deleteOutfit(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
  ) {
    await this.outfitService.remove(id, this.userId(req));
  }

  // --- calendar ----------------------------------------------------------

  @Get('calendar')
  async listCalendar(
    @Query('from') from: string,
    @Query('to') to: string,
    @Req() req: FastifyRequest,
  ) {
    const entries = await this.calendarService.findRange(
      parseDate('from', from),
      parseDate('to', to),
      this.userId(req),
    );
    return entries.map(serializeCalendarEntry);
  }

  @Post('calendar')
  async createCalendarEntry(@Body() body: Json, @Req() req: FastifyRequest) {
    if (!Number.isInteger(body?.outfitId)) {
      throw new BadRequestException('outfitId must be an id');
    }
    const userId = this.userId(req);
    const entry = await this.calendarService.create(
      {
        date: parseDate('date', body.date),
        outfitId: body.outfitId as number,
        notes:
          body.notes === undefined
            ? undefined
            : optionalString('notes', body.notes),
      },
      userId,
    );
    return serializeCalendarEntry(
      await this.calendarService.findOneOwned(entry.id, userId),
    );
  }

  @Put('calendar/:id/worn')
  async setWorn(
    @Param('id', ParseIntPipe) id: number,
    @Body('worn') worn: unknown,
    @Req() req: FastifyRequest,
  ) {
    if (typeof worn !== 'boolean') {
      throw new BadRequestException('worn must be true or false');
    }
    const userId = this.userId(req);
    await this.calendarService.setWorn(id, worn, userId);
    return serializeCalendarEntry(
      await this.calendarService.findOneOwned(id, userId),
    );
  }

  @Delete('calendar/:id')
  @HttpCode(204)
  async deleteCalendarEntry(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
  ) {
    await this.calendarService.remove(id, this.userId(req));
  }
}
