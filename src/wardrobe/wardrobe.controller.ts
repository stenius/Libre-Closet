import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Render,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { I18n, I18nContext } from 'nestjs-i18n';
import { ConditionalAuthGuard } from '../auth/conditional-auth.guard';
import { Payload } from '../auth/dto/payload.dto';
import { GarmentCategory } from './garment-category.enum';
import { GarmentColor } from './garment-color.enum';
import { GarmentService } from './garment.service';
import { WearService } from './wear.service';
import { parseDate } from './api.parsers';
import { WardrobeShareService } from '../wardrobe-share/wardrobe-share.service';
import { SharePermission } from '../dal/entity/wardrobe-share.entity';
import type { SearchGarmentDto } from './dto/search-garment.dto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  formatWarmthRange,
  GarmentAttributesInput,
  parseGarmentAttributes,
} from './garment-attributes';

@UseGuards(ConditionalAuthGuard)
@Controller('wardrobe')
export class WardrobeController {
  private readonly logger = new Logger(WardrobeController.name);

  constructor(
    private readonly garmentService: GarmentService,
    private readonly wearService: WearService,
    private readonly shareService: WardrobeShareService,
  ) {}

  private userId(req: any): number | undefined {
    return (req['user'] as Payload | undefined)?.userId;
  }

  @Get()
  @Render('wardrobe/index')
  async index(
    @Req() req: FastifyRequest,
    @Query() query: SearchGarmentDto,
    @Query('ownerId') ownerId: string | undefined,
    @I18n() i18n: I18nContext,
  ) {
    const userId = this.userId(req);
    let viewOwner: number | undefined;
    let sharedWardrobes: any[] = [];
    let canEdit = true;

    if (userId != null) {
      sharedWardrobes = await this.shareService.getInboundShares(userId);
      sharedWardrobes = sharedWardrobes.map((s) => ({
        id: s.id,
        grantorId: s.grantor.unwrap().id,
        grantorName: s.grantor.unwrap().firstName || s.grantor.unwrap().email,
        permission: s.permission,
      }));
    }

    if (ownerId && userId != null) {
      viewOwner = parseInt(ownerId, 10);
      if (viewOwner === userId) {
        viewOwner = undefined;
      } else {
        const canView = await this.shareService.canView(userId, viewOwner);
        if (!canView) throw new ForbiddenException();
        const perm = await this.shareService.getSharePermission(
          userId,
          viewOwner,
        );
        canEdit = perm === SharePermission.MANAGE;
      }
    }

    const [garments, filters] = await Promise.all([
      this.garmentService.findAll(userId, query, viewOwner),
      this.garmentService.findAvailableFilters(viewOwner ?? userId),
    ]);
    const availableCategories = filters.categories.map((value) => ({
      value,
      label: this.garmentService.resolveCategoryLabel(value, i18n),
    }));
    return {
      garments,
      availableCategories,
      colors: Object.values(GarmentColor),
      availableSizes: filters.sizes,
      search: query,
      sharedWardrobes,
      viewOwner: viewOwner ?? null,
      canEdit,
    };
  }

  @Get('new')
  @Render('wardrobe/form')
  async newForm(
    @Req() req: FastifyRequest,
    @I18n() i18n: I18nContext,
    @Query('ownerId') ownerId: string | undefined,
  ) {
    const userId = this.userId(req);
    const viewOwner = ownerId ? parseInt(ownerId, 10) : undefined;
    if (userId != null && viewOwner != null && viewOwner !== userId) {
      const canManage = await this.shareService.canManage(userId, viewOwner);
      if (!canManage) throw new ForbiddenException();
    }
    const filters = await this.garmentService.findAvailableFilters(
      viewOwner ?? userId,
    );
    const enumValues = Object.values(GarmentCategory) as string[];
    const customCategories = filters.categories.filter(
      (c) => !enumValues.includes(c),
    );
    const categories = [...enumValues, ...customCategories].map((value) => ({
      value,
      label: this.garmentService.resolveCategoryLabel(value, i18n),
    }));
    return {
      categories,
      colors: Object.values(GarmentColor),
      garment: null,
      viewOwner,
    };
  }

  @Post()
  async create(
    @Body()
    body: {
      name?: string;
      category: string;
      brand?: string;
      color?: string | string[];
      size?: string;
      notes?: string;
      washingDetails?: string;
      dateAquired?: string;
    } & GarmentAttributesInput,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query('ownerId') ownerId: string | undefined,
  ) {
    const userId = this.userId(req);
    const viewOwner = ownerId ? parseInt(ownerId, 10) : undefined;

    if (userId != null && viewOwner != null && viewOwner !== userId) {
      const canManage = await this.shareService.canManage(userId, viewOwner);
      if (!canManage) throw new ForbiddenException();
    }

    // Fastify gives string if one checkbox, string[] if multiple — normalise both
    const rawColors = Array.isArray(body.color)
      ? body.color
      : (body.color
          ?.split(',')
          .map((c) => c.trim())
          .filter(Boolean) ?? []);

    const garment = await this.garmentService.create(
      {
        name: body.name,
        category: body.category,
        brand: body.brand,
        color: rawColors.join(','),
        size: body.size,
        notes: body.notes,
        washingDetails: body.washingDetails,
        dateAquired: body.dateAquired,
        ...parseGarmentAttributes(body),
      },
      viewOwner ?? userId,
    );

    const params = new URLSearchParams({ created: '1' });
    if (viewOwner) params.set('ownerId', String(viewOwner));
    return reply.redirect(`/wardrobe/${garment.id}?${params}`, 302);
  }

  @Get('repairs')
  @Render('wardrobe/repairs')
  async repairs(@Req() req: FastifyRequest) {
    return {
      garments: await this.garmentService.findAll(this.userId(req), {
        disposition: 'repair',
      }),
    };
  }

  @Get('wear-stats')
  @Render('wardrobe/wear-stats')
  async wearStats(@Req() req: FastifyRequest) {
    return { stats: await this.wearService.stats(this.userId(req)) };
  }

  @Post(':id/wears')
  async logWear(
    @Param('id', ParseIntPipe) id: number,
    @Body('date') date: unknown,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    parseDate('date', date);
    await this.wearService.log(id, date as string, this.userId(req));
    return reply.redirect(`/wardrobe/${id}`, 302);
  }

  @Get(':id')
  @Render('wardrobe/show')
  async show(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
    @I18n() i18n: I18nContext,
    @Query('ownerId') ownerId: string | undefined,
    @Query('created') created: string | undefined,
    @Query('photoSaved') photoSaved: string | undefined,
  ) {
    const userId = this.userId(req);
    const viewOwner = ownerId ? parseInt(ownerId, 10) : undefined;
    const garment = await this.garmentService.findOne(id, userId, viewOwner);

    let canEdit = true;
    let canDelete = true;
    let canClone = true;
    if (userId != null && viewOwner != null && viewOwner !== userId) {
      const perm = await this.shareService.getSharePermission(
        userId,
        viewOwner,
      );
      canEdit = perm === SharePermission.MANAGE;
      canClone = perm === SharePermission.MANAGE;
      canDelete = false;
    } else if (userId != null && garment.owner?.id !== userId) {
      canEdit = false;
      canDelete = false;
      canClone = false;
    }

    const extraPhotos = await this.garmentService.listPhotos(
      id,
      userId,
      viewOwner,
    );

    return {
      garment,
      extraPhotos: extraPhotos.map((photo) => ({
        id: photo.id,
        label: photo.label,
        fileName: photo.file.getEntity().fileName,
      })),
      categoryLabel: this.garmentService.resolveCategoryLabel(
        garment.category,
        i18n,
      ),
      canEdit,
      canDelete,
      canClone,
      viewOwner: viewOwner ?? null,
      justCreated: created === '1',
      justSavedPhoto: photoSaved === '1',
      wear:
        viewOwner == null
          ? (await this.wearService.stats(userId, true)).find(
              (stat) => stat.garmentId === id,
            )
          : undefined,
      warmthRange: formatWarmthRange(garment.warmthMinF, garment.warmthMaxF),
    };
  }

  @Get(':id/edit')
  @Render('wardrobe/form')
  async editForm(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
    @I18n() i18n: I18nContext,
    @Query('ownerId') ownerId: string | undefined,
  ) {
    const userId = this.userId(req);
    const viewOwner = ownerId ? parseInt(ownerId, 10) : undefined;

    if (userId != null && viewOwner != null && viewOwner !== userId) {
      const canManage = await this.shareService.canManage(userId, viewOwner);
      if (!canManage) throw new ForbiddenException();
    }

    const [garment, filters] = await Promise.all([
      this.garmentService.findOne(id, userId, viewOwner),
      this.garmentService.findAvailableFilters(viewOwner ?? userId),
    ]);
    const enumValues = Object.values(GarmentCategory) as string[];
    const customCategories = filters.categories.filter(
      (c) => !enumValues.includes(c),
    );
    const categories = [...enumValues, ...customCategories].map((value) => ({
      value,
      label: this.garmentService.resolveCategoryLabel(value, i18n),
    }));
    const colorEnumValues = Object.values(GarmentColor) as string[];
    const savedColors =
      garment.color
        ?.split(',')
        .map((c) => c.trim())
        .filter(Boolean) ?? [];
    const customColors = savedColors.filter(
      (c) => !colorEnumValues.includes(c),
    );

    return {
      garment,
      categories,
      colors: colorEnumValues,
      customColors,
      viewOwner: viewOwner ?? null,
    };
  }

  @Get(':id/clone')
  @Render('wardrobe/form')
  async cloneForm(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
    @I18n() i18n: I18nContext,
    @Query('ownerId') ownerId: string | undefined,
  ) {
    const userId = this.userId(req);
    const viewOwner = ownerId ? parseInt(ownerId, 10) : undefined;
    const [garment, filters] = await Promise.all([
      this.garmentService.findOne(id, userId, viewOwner),
      this.garmentService.findAvailableFilters(viewOwner ?? userId),
    ]);
    const enumValues = Object.values(GarmentCategory) as string[];
    const customCategories = filters.categories.filter(
      (c) => !enumValues.includes(c),
    );
    const categories = [...enumValues, ...customCategories].map((value) => ({
      value,
      label: this.garmentService.resolveCategoryLabel(value, i18n),
    }));
    return {
      garment,
      isClone: true,
      cloneName: garment.name ? `${garment.name} (cloned)` : undefined,
      categories,
      colors: Object.values(GarmentColor),
      viewOwner: viewOwner ?? null,
    };
  }

  @Post(':id/clone')
  async cloneCreate(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      name?: string;
      category: string;
      brand?: string;
      color?: GarmentColor;
      size?: string;
      notes?: string;
    } & GarmentAttributesInput,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query('ownerId') ownerId: string | undefined,
  ) {
    const userId = this.userId(req);
    const viewOwner = ownerId ? parseInt(ownerId, 10) : undefined;
    // Verify the requesting user has access to the source garment
    await this.garmentService.findOne(id, userId, viewOwner);
    const cloned = await this.garmentService.clone(
      id,
      {
        name: body.name,
        category: body.category,
        brand: body.brand,
        color: Array.isArray(body.color) ? body.color.join(',') : body.color,
        size: body.size,
        notes: body.notes,
        ...parseGarmentAttributes(body),
      },
      userId,
    );
    return reply.redirect(`/wardrobe/${cloned.id}`, 302);
  }

  @Post(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      name?: string;
      category?: string;
      brand?: string;
      color?: GarmentColor;
      size?: string;
      notes?: string;
      washingDetails?: string;
      dateAquired?: string;
    } & GarmentAttributesInput,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query('ownerId') ownerId: string | undefined,
  ) {
    const userId = this.userId(req);
    const viewOwner = ownerId ? parseInt(ownerId, 10) : undefined;

    if (userId != null && viewOwner != null && viewOwner !== userId) {
      const canManage = await this.shareService.canManage(userId, viewOwner);
      if (!canManage) throw new ForbiddenException();
    }

    await this.garmentService.update(
      id,
      {
        name: body.name,
        category: body.category,
        brand: body.brand,
        color: Array.isArray(body.color) ? body.color.join(',') : body.color,
        size: body.size,
        notes: body.notes,
        washingDetails: body.washingDetails,
        dateAquired: body.dateAquired,
        ...parseGarmentAttributes(body),
      },
      viewOwner ?? userId,
      userId,
    );
    const redirectSuffix = viewOwner ? `?ownerId=${viewOwner}` : '';
    return reply.redirect(`/wardrobe/${id}${redirectSuffix}`, 302);
  }

  private async assertCanManage(
    userId: number | undefined,
    viewOwner: number | undefined,
  ): Promise<void> {
    if (userId != null && viewOwner != null && viewOwner !== userId) {
      const canManage = await this.shareService.canManage(userId, viewOwner);
      if (!canManage) throw new ForbiddenException();
    }
  }

  @Post(':id/photos')
  async addExtraPhoto(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query('ownerId') ownerId: string | undefined,
  ) {
    const userId = this.userId(req);
    const viewOwner = ownerId ? parseInt(ownerId, 10) : undefined;
    await this.assertCanManage(userId, viewOwner);
    await this.garmentService.addPhoto(
      id,
      () => (req as any).files({ limits: { files: 1 } }),
      null,
      userId,
      viewOwner,
    );
    const suffix = viewOwner ? `?ownerId=${viewOwner}` : '';
    return reply.redirect(`/wardrobe/${id}${suffix}`, 302);
  }

  @Post(':id/photos/:photoId/delete')
  async removeExtraPhoto(
    @Param('id', ParseIntPipe) id: number,
    @Param('photoId', ParseIntPipe) photoId: number,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query('ownerId') ownerId: string | undefined,
  ) {
    const userId = this.userId(req);
    const viewOwner = ownerId ? parseInt(ownerId, 10) : undefined;
    await this.assertCanManage(userId, viewOwner);
    await this.garmentService.removePhoto(id, photoId, userId, viewOwner);
    const suffix = viewOwner ? `?ownerId=${viewOwner}` : '';
    return reply.redirect(`/wardrobe/${id}${suffix}`, 302);
  }

  @Post(':id/photo')
  async uploadPhoto(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query('ownerId') ownerId: string | undefined,
  ) {
    const userId = this.userId(req);
    const viewOwner = ownerId ? parseInt(ownerId, 10) : undefined;

    if (userId != null && viewOwner != null && viewOwner !== userId) {
      const canManage = await this.shareService.canManage(userId, viewOwner);
      if (!canManage) throw new ForbiddenException();
    }

    await this.garmentService.update(
      id,
      { files: req.files({ limits: { files: 2 } }) },
      viewOwner ?? userId,
      userId,
    );
    const params = new URLSearchParams({ photoSaved: '1' });
    if (viewOwner) params.set('ownerId', String(viewOwner));
    reply.header('HX-Redirect', `/wardrobe/${id}?${params}`);
    return reply.send();
  }

  @Post(':id/archive')
  async archive(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query('ownerId') ownerId: string | undefined,
  ) {
    const userId = this.userId(req);
    const viewOwner = ownerId ? parseInt(ownerId, 10) : undefined;

    // Archive/unarchive is only allowed for the owner
    if (viewOwner != null && viewOwner !== userId) {
      throw new ForbiddenException();
    }

    await this.garmentService.archive(id, userId);
    const redirectSuffix = viewOwner ? `?ownerId=${viewOwner}` : '';
    reply.header('HX-Redirect', `/wardrobe${redirectSuffix}`);
    return reply.send();
  }

  @Post(':id/nobg')
  async updateNobg(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query('ownerId') ownerId: string | undefined,
  ) {
    const userId = this.userId(req);
    const viewOwner = ownerId ? parseInt(ownerId, 10) : undefined;

    if (userId != null && viewOwner != null && viewOwner !== userId) {
      const canManage = await this.shareService.canManage(userId, viewOwner);
      if (!canManage) throw new ForbiddenException();
    }

    const nobgPhoto = await req.file();
    await this.garmentService.updateNobg(
      id,
      nobgPhoto,
      viewOwner ?? userId,
      userId,
    );
    const redirectSuffix = viewOwner ? `?ownerId=${viewOwner}` : '';
    reply.header('HX-Redirect', `/wardrobe/${id}${redirectSuffix}`);
    return reply.send();
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query('ownerId') ownerId: string | undefined,
  ) {
    const userId = this.userId(req);
    const viewOwner = ownerId ? parseInt(ownerId, 10) : undefined;

    // Delete is only allowed for the owner
    if (viewOwner != null && viewOwner !== userId) {
      throw new ForbiddenException();
    }

    await this.garmentService.remove(id, userId);
    reply.header('HX-Redirect', '/wardrobe');
    return reply.send();
  }
}
