import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable, NotFoundException } from '@nestjs/common';
import { GarmentWear } from '../dal/entity/garment-wear.entity';
import { OutfitCalendar } from '../dal/entity/outfit-calendar.entity';
import { GarmentService } from './garment.service';
import { computeWearStats, WearEvent, WearStat } from './wear-stats';

@Injectable()
export class WearService {
  constructor(
    @InjectRepository(GarmentWear)
    private readonly wearRepository: EntityRepository<GarmentWear>,
    @InjectRepository(OutfitCalendar)
    private readonly calendarRepository: EntityRepository<OutfitCalendar>,
    private readonly garmentService: GarmentService,
  ) {}

  /** Logging the same day twice returns the existing record. */
  async log(
    garmentId: number,
    wornOn: string,
    userId?: number,
  ): Promise<GarmentWear> {
    const garment = await this.garmentService.findOne(garmentId, userId);
    const existing = await this.wearRepository.findOne({
      garment: garmentId,
      wornOn,
    });
    if (existing) return existing;
    const wear = this.wearRepository.create({
      garment: garment as any,
      wornOn,
    });
    await this.wearRepository.getEntityManager().persistAndFlush(wear);
    return wear;
  }

  async list(garmentId: number, userId?: number): Promise<GarmentWear[]> {
    await this.garmentService.findOne(garmentId, userId);
    return this.wearRepository.find(
      { garment: garmentId },
      { orderBy: { wornOn: 'DESC' } },
    );
  }

  async remove(
    garmentId: number,
    wearId: number,
    userId?: number,
  ): Promise<void> {
    await this.garmentService.findOne(garmentId, userId);
    const deleted = await this.wearRepository.nativeDelete({
      id: wearId,
      garment: garmentId,
    });
    if (!deleted) throw new NotFoundException('Wear record not found');
  }

  async stats(userId?: number, includeArchived = false): Promise<WearStat[]> {
    const garments = await this.garmentService.findAll(userId, {
      archived: includeArchived ? 'true' : undefined,
    });
    const ids = garments.map((g) => g.id);
    const [wears, entries] = await Promise.all([
      this.wearRepository.find({ garment: { $in: ids } }),
      this.calendarRepository.find(
        {
          wornAt: { $ne: null },
          ...(userId != null ? { owner: { id: userId } } : { owner: null }),
        },
        { populate: ['outfit.garments'] },
      ),
    ]);

    const events: WearEvent[] = wears.map((wear) => ({
      garmentId: wear.garment.id,
      day: wear.wornOn,
    }));
    for (const entry of entries) {
      const day = new Date(entry.date).toISOString().slice(0, 10);
      for (const garment of entry.outfit.getEntity().garments.getItems()) {
        events.push({ garmentId: garment.id, day });
      }
    }
    return computeWearStats(garments, events);
  }
}
