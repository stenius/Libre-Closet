import { EntityRepository, wrap } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { I18nContext } from 'nestjs-i18n';
import type { MultipartFile } from '@fastify/multipart';
import { File } from '../dal/entity/file.entity';
import { FileService } from '../file/file-service.abstract';
import { Garment } from '../dal/entity/garment.entity';
import { OutfitPhoto } from '../dal/entity/outfit-photo.entity';
import { Outfit, OutfitSlot } from '../dal/entity/outfit.entity';
import { User } from '../dal/entity/user.entity';
import { GarmentCategory } from './garment-category.enum';
import { GarmentService } from './garment.service';
import { CreateOutfitDto } from './dto/create-outfit.dto';
import { UpdateOutfitDto } from './dto/update-outfit.dto';
@Injectable()
export class OutfitService {
  private readonly logger = new Logger(OutfitService.name);

  constructor(
    @InjectRepository(Outfit)
    private readonly outfitRepository: EntityRepository<Outfit>,
    @InjectRepository(OutfitPhoto)
    private readonly photoRepository: EntityRepository<OutfitPhoto>,
    @InjectRepository(Garment)
    private readonly garmentRepository: EntityRepository<Garment>,
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
    private readonly garmentService: GarmentService,
    private readonly fileService: FileService,
  ) {}

  async findAll(userId?: number): Promise<Outfit[]> {
    if (userId != null) {
      return this.outfitRepository.find(
        { owner: { id: userId } },
        { populate: ['garments', 'garments.photo', 'photo'] },
      );
    }
    // AUTH_ENABLED=false: only return outfits that belong to no user
    return this.outfitRepository.find(
      { owner: null },
      { populate: ['garments', 'garments.photo', 'photo'] },
    );
  }

  async findOne(id: number, userId?: number): Promise<Outfit> {
    const outfit = await this.outfitRepository.findOne(id, {
      populate: ['garments', 'garments.photo', 'photo'],
    });
    if (!outfit) throw new NotFoundException('Outfit not found');
    if (userId != null) {
      // auth mode: must be the owner
      if (outfit.owner?.id !== userId) throw new ForbiddenException();
    } else {
      // no-auth mode: only allow ownerless outfits
      if (outfit.owner != null) throw new ForbiddenException();
    }
    return outfit;
  }

  async findOneByShareableId(shareableId: string): Promise<Outfit> {
    const outfit = await this.outfitRepository.findOne(
      { shareableId },
      { populate: ['garments', 'garments.photo'] },
    );
    if (!outfit) throw new NotFoundException('Outfit not found');
    return outfit;
  }

  async create(dto: CreateOutfitDto, userId?: number): Promise<Outfit> {
    const outfit = this.outfitRepository.create({
      name: dto.name,
      notes: dto.notes,
      slots: dto.slots,
    });

    const garmentIds =
      dto.slots
        ?.map((s) => s.garmentId)
        .filter((id): id is number => id !== null) ?? [];

    if (garmentIds.length) {
      const garments = await this.garmentRepository.find({
        id: { $in: garmentIds },
      });
      outfit.garments.set(garments);
    }

    if (userId != null) {
      const user = await this.userRepository.findOneOrFail(userId);
      outfit.owner = user as any;
    }

    await this.outfitRepository.getEntityManager().persistAndFlush(outfit);
    return outfit;
  }

  async update(
    id: number,
    dto: UpdateOutfitDto,
    userId?: number,
  ): Promise<Outfit> {
    const outfit = await this.findOne(id, userId);

    wrap(outfit).assign({
      name: dto.name ?? outfit.name,
      notes: dto.notes ?? outfit.notes,
      slots: dto.slots ?? outfit.slots,
    });

    if (dto.slots !== undefined) {
      const garmentIds = dto.slots
        .map((s) => s.garmentId)
        .filter((id): id is number => id !== null);
      const garments = await this.garmentRepository.find({
        id: { $in: garmentIds },
      });
      outfit.garments.set(garments);
    }

    await this.outfitRepository.getEntityManager().flush();
    return outfit;
  }

  async remove(id: number, userId?: number): Promise<void> {
    const outfit = await this.findOne(id, userId);
    const photo = outfit.photo as unknown as File | undefined;
    const extras = await this.findExtraPhotos(id);
    await this.outfitRepository.getEntityManager().removeAndFlush(outfit);
    await this.deleteStoredPhoto(photo);
    await Promise.all(
      extras.map((extra) => this.deleteStoredPhoto(extra.file.getEntity())),
    );
  }

  private findExtraPhotos(outfitId: number): Promise<OutfitPhoto[]> {
    return this.photoRepository.find(
      { outfit: outfitId },
      { populate: ['file'], orderBy: { id: 'ASC' } },
    );
  }

  async listExtraPhotos(id: number, userId?: number): Promise<OutfitPhoto[]> {
    await this.findOne(id, userId);
    return this.findExtraPhotos(id);
  }

  /** Stores one photo from a multipart upload, after access has been checked. */
  private async storeUpload(
    getFiles: () => AsyncIterableIterator<MultipartFile>,
    userId?: number,
  ): Promise<File> {
    let stored: Promise<File> | undefined;
    for await (const part of getFiles()) {
      if (part.fieldname === 'photo' && !stored) {
        stored = this.fileService.storeImageFromFileUpload(part, userId);
        // Awaited after the loop; a rejection before then must not crash Node.
        stored.catch(() => undefined);
      } else {
        part.file.resume();
      }
    }
    if (!stored) throw new BadRequestException('photo file is required');
    return stored;
  }

  /** Adds a photo. The first one an outfit gets becomes its cover. */
  async addPhoto(
    id: number,
    getFiles: () => AsyncIterableIterator<MultipartFile>,
    label: string | null,
    userId?: number,
  ): Promise<void> {
    const outfit = await this.findOne(id, userId);
    const file = await this.storeUpload(getFiles, userId);
    const em = this.outfitRepository.getEntityManager();
    if (!outfit.photo) {
      outfit.photo = file as any;
      outfit.photoLabel = label;
    } else {
      em.persist(
        this.photoRepository.create({
          outfit: outfit as any,
          file: file as any,
          label,
          createdAt: new Date(),
        }),
      );
    }
    await em.flush();
  }

  /** Swaps an additional photo with the current cover. */
  async setCover(id: number, photoId: number, userId?: number): Promise<void> {
    const outfit = await this.findOne(id, userId);
    const extra = await this.findExtraPhoto(id, photoId);
    const previous = outfit.photo as unknown as File;
    const previousLabel = outfit.photoLabel ?? null;
    outfit.photo = extra.file.getEntity() as any;
    outfit.photoLabel = extra.label ?? null;
    extra.file = wrap(previous).toReference() as any;
    extra.label = previousLabel;
    await this.outfitRepository.getEntityManager().flush();
  }

  async removeExtraPhoto(
    id: number,
    photoId: number,
    userId?: number,
  ): Promise<void> {
    await this.findOne(id, userId);
    const extra = await this.findExtraPhoto(id, photoId);
    const file = extra.file.getEntity();
    await this.photoRepository.nativeDelete({ id: extra.id });
    await this.deleteStoredPhoto(file);
  }

  private async findExtraPhoto(
    outfitId: number,
    photoId: number,
  ): Promise<OutfitPhoto> {
    const extra = await this.photoRepository.findOne(
      { id: photoId, outfit: outfitId },
      { populate: ['file'] },
    );
    if (!extra) throw new NotFoundException('Photo not found');
    return extra;
  }

  /**
   * Sets or replaces the outfit photo. Access is checked before `getFiles`
   * opens the multipart stream, so a rejected upload never reaches storage.
   */
  async setPhoto(
    id: number,
    getFiles: () => AsyncIterableIterator<MultipartFile>,
    userId?: number,
  ): Promise<Outfit> {
    const outfit = await this.findOne(id, userId);
    const file = await this.storeUpload(getFiles, userId);

    const previous = outfit.photo as unknown as File | undefined;
    outfit.photo = file as any;
    outfit.photoLabel = null;
    await this.outfitRepository.getEntityManager().flush();
    await this.deleteStoredPhoto(previous);
    return outfit;
  }

  async removePhoto(id: number, userId?: number): Promise<void> {
    const outfit = await this.findOne(id, userId);
    const photo = outfit.photo as unknown as File | undefined;
    if (!photo) return;
    // The oldest additional photo, if any, takes over as the cover.
    const [next] = await this.findExtraPhotos(id);
    (outfit as any).photo = next ? next.file.getEntity() : null;
    outfit.photoLabel = next?.label ?? null;
    if (next) {
      await this.photoRepository.nativeDelete({ id: next.id });
    }
    await this.outfitRepository.getEntityManager().flush();
    await this.deleteStoredPhoto(photo);
  }

  private async deleteStoredPhoto(photo?: File | null): Promise<void> {
    if (!photo) return;
    await this.fileService
      .delete(photo.fileName)
      .catch((err) => this.logger.warn(err));
    await this.outfitRepository
      .getEntityManager()
      .nativeDelete(File, { id: photo.id });
  }

  parseSlotsFromBody(
    category: string | string[] | undefined,
    garmentId: string | string[] | undefined,
  ): OutfitSlot[] {
    const cats = Array.isArray(category)
      ? category
      : category
        ? [category]
        : [];
    const ids = Array.isArray(garmentId)
      ? garmentId
      : garmentId
        ? [garmentId]
        : [];
    return cats.map((cat, i) => ({
      category: cat,
      garmentId: ids[i] ? Number(ids[i]) : null,
    }));
  }

  buildCategoryRows(
    garments: Garment[],
    selectedIds: number[],
    i18n: I18nContext,
    slots?: OutfitSlot[],
  ) {
    const grouped: Partial<Record<string, Garment[]>> = {};
    for (const g of garments) {
      (grouped[g.category] ??= []).push(g);
    }

    const toRow = (
      category: string,
      items: Garment[],
      selectedId: number | null,
      defaultFirst = false,
    ) => {
      const selectedIdx =
        selectedId != null ? items.findIndex((g) => g.id === selectedId) : -1;
      let idx = 0;
      if (selectedIdx >= 0) {
        idx = selectedIdx + 1;
      } else if (defaultFirst && items.length > 0) {
        idx = 1;
      }
      return this.buildRow(category, items, idx, i18n);
    };

    // Slot-based path: preserves saved order and duplicate categories
    if (slots?.length) {
      return slots
        .filter((slot) => grouped[slot.category]?.length)
        .map((slot) => {
          const items = grouped[slot.category]!;
          const selected =
            slot.garmentId != null
              ? (items.find((g) => g.id === slot.garmentId) ?? null)
              : null;
          return toRow(slot.category, items, selected?.id ?? null, false);
        });
    }

    // Fallback: enum order, one row per category with garments
    const enumOrder = Object.values(GarmentCategory);
    const orderedKeys = [
      ...enumOrder.filter((c) => grouped[c]?.length),
      ...Object.keys(grouped)
        .filter(
          (c) => !(enumOrder as string[]).includes(c) && grouped[c]?.length,
        )
        .sort(),
    ];
    return orderedKeys.map((cat) => {
      const items = grouped[cat]!;
      const selected = items.find((g) => selectedIds.includes(g.id)) ?? null;
      return toRow(cat, items, selected?.id ?? null, true);
    });
  }

  buildRow(category: string, items: Garment[], idx: number, i18n: I18nContext) {
    const count = items.length;
    const sel = idx > 0 ? (items[idx - 1] ?? null) : null;
    return {
      value: category,
      label: this.garmentService.resolveCategoryLabel(category, i18n),
      garmentCount: count,
      currentIndex: idx,
      prevIndex: idx === 0 ? count : idx - 1,
      nextIndex: idx === count ? 0 : idx + 1,
      currentGarment: sel
        ? {
            id: sel.id,
            name: sel.name,
            photo: sel.photo ? `/file/nobg/${sel.photo.fileName}` : null,
            brand: sel.brand ?? null,
            color: sel.color ?? null,
            size: sel.size ?? null,
            notes: sel.notes ?? null,
          }
        : null,
      garmentId: sel?.id ?? null,
    };
  }
}
