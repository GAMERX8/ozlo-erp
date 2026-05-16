import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  create(
    @Query('workspaceId') workspaceId: string,
    @Body() createCategoryDto: CreateCategoryDto,
    @Request() req,
  ) {
    return this.categoriesService.create(workspaceId, createCategoryDto, req.user.id);
  }

  @Get()
  findAll(@Query('workspaceId') workspaceId: string) {
    return this.categoriesService.findAll(workspaceId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('workspaceId') workspaceId: string) {
    return this.categoriesService.findOne(id, workspaceId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @Request() req,
  ) {
    return this.categoriesService.update(id, workspaceId, updateCategoryDto, req.user.id);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Request() req,
  ) {
    return this.categoriesService.remove(id, workspaceId, req.user.id);
  }
}
