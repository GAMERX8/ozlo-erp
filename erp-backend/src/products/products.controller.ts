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
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { CombinedAuthGuard } from '../auth/guards/combined-auth.guard';

@ApiTags('Productos')
@ApiSecurity('x-api-key')
@Controller('products')
@UseGuards(CombinedAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @ApiOperation({ summary: 'Crear un nuevo producto' })
  @ApiQuery({ name: 'workspaceId', required: false, description: 'Opcional si se usa API Key (se toma del contexto de la llave)' })
  @Post()
  create(
    @Query('workspaceId') workspaceId: string,
    @Body() createProductDto: CreateProductDto,
    @Request() req,
  ) {
    console.log('--- PRODUCT CONTROLLER: CREATE ---');
    console.log('WorkspaceID Query:', workspaceId);
    console.log('Payload:', JSON.stringify(createProductDto, null, 2));
    console.log('User ID:', req.user?.id);
    
    return this.productsService.create(workspaceId, createProductDto, req.user.id);
  }

  @ApiOperation({ summary: 'Listar todos los productos del workspace' })
  @ApiQuery({ name: 'workspaceId', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @Get()
  findAll(
    @Query('workspaceId') workspaceId: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
  ) {
    return this.productsService.findAll(workspaceId, categoryId, search);
  }

  @ApiOperation({ summary: 'Obtener un producto por ID' })
  @ApiQuery({ name: 'workspaceId', required: false })
  @Get(':id')
  findOne(@Param('id') id: string, @Query('workspaceId') workspaceId: string) {
    return this.productsService.findOne(id, workspaceId);
  }

  @Get(':id/kardex')
  getKardex(@Param('id') id: string, @Query('workspaceId') workspaceId: string) {
    return this.productsService.getKardex(id, workspaceId);
  }

  @ApiOperation({ summary: 'Actualizar un producto' })
  @ApiQuery({ name: 'workspaceId', required: false })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() updateProductDto: UpdateProductDto,
    @Request() req,
  ) {
    return this.productsService.update(id, workspaceId, updateProductDto, req.user.id);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Request() req,
  ) {
    return this.productsService.remove(id, workspaceId, req.user.id);
  }
}
