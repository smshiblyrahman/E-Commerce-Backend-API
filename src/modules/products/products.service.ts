import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, MoreThanOrEqual } from 'typeorm';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Product } from '../../database/entities/product.entity';
import { Category } from '../../database/entities/category.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import slugify from 'slugify';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const slug = this.generateSlug(createProductDto.name);

    // Check if SKU already exists
    const existingSku = await this.productRepository.findOne({
      where: { sku: createProductDto.sku },
    });

    if (existingSku) {
      throw new BadRequestException('Product with this SKU already exists');
    }

    // Check if category exists
    if (createProductDto.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: createProductDto.categoryId },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    const product = this.productRepository.create({
      ...createProductDto,
      slug,
    });

    const savedProduct = await this.productRepository.save(product);

    // Invalidate cache
    await this.cacheManager.del('products:*');

    return savedProduct;
  }

  async findAll(queryDto: QueryProductsDto) {
    const {
      page = 1,
      limit = 20,
      search,
      categoryId,
      minPrice,
      maxPrice,
      inStock,
      isFeatured,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = queryDto;

    const cacheKey = `products:${JSON.stringify(queryDto)}`;
    const cached = await this.cacheManager.get(cacheKey);

    if (cached) {
      return cached;
    }

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.isActive = :isActive', { isActive: true });

    if (search) {
      queryBuilder.andWhere(
        '(product.name ILIKE :search OR product.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (categoryId) {
      queryBuilder.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    if (minPrice !== undefined) {
      queryBuilder.andWhere('product.price >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined) {
      queryBuilder.andWhere('product.price <= :maxPrice', { maxPrice });
    }

    if (inStock !== undefined) {
      if (inStock) {
        queryBuilder.andWhere(
          '(product.trackInventory = false OR product.stockQuantity > 0)',
        );
      } else {
        queryBuilder.andWhere(
          'product.trackInventory = true AND product.stockQuantity = 0',
        );
      }
    }

    if (isFeatured !== undefined) {
      queryBuilder.andWhere('product.isFeatured = :isFeatured', {
        isFeatured,
      });
    }

    queryBuilder.orderBy(`product.${sortBy}`, sortOrder);

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [products, total] = await queryBuilder.getManyAndCount();

    const result = {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    // Cache for 5 minutes
    await this.cacheManager.set(cacheKey, result, 300000);

    return result;
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['category'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async findBySlug(slug: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { slug },
      relations: ['category'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);

    if (updateProductDto.name && updateProductDto.name !== product.name) {
      updateProductDto['slug'] = this.generateSlug(updateProductDto.name);
    }

    if (updateProductDto.sku && updateProductDto.sku !== product.sku) {
      const existingSku = await this.productRepository.findOne({
        where: { sku: updateProductDto.sku },
      });

      if (existingSku) {
        throw new BadRequestException('Product with this SKU already exists');
      }
    }

    if (updateProductDto.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: updateProductDto.categoryId },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    Object.assign(product, updateProductDto);
    const updatedProduct = await this.productRepository.save(product);

    // Invalidate cache
    await this.cacheManager.del('products:*');

    return updatedProduct;
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);

    // Invalidate cache
    await this.cacheManager.del('products:*');
  }

  private generateSlug(name: string): string {
    const baseSlug = slugify(name, { lower: true, strict: true });
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    return `${baseSlug}-${randomSuffix}`;
  }
}
