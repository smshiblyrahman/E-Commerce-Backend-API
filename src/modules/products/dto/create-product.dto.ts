import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  Min,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class DimensionsDto {
  @ApiProperty()
  @IsNumber()
  length: number;

  @ApiProperty()
  @IsNumber()
  width: number;

  @ApiProperty()
  @IsNumber()
  height: number;
}

export class CreateProductDto {
  @ApiProperty({ example: 'Wireless Headphones' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'High-quality noise-canceling headphones', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 99.99 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 129.99, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  compareAtPrice?: number;

  @ApiProperty({ example: 50.00, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  cost?: number;

  @ApiProperty({ example: 'WH-1000' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ example: ['image1.jpg', 'image2.jpg'], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @ApiProperty({ example: 100, default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  stockQuantity?: number;

  @ApiProperty({ example: 10, default: 10 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  lowStockThreshold?: number;

  @ApiProperty({ default: true })
  @IsBoolean()
  @IsOptional()
  trackInventory?: boolean;

  @ApiProperty({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ example: 0.5, required: false })
  @IsNumber()
  @IsOptional()
  weight?: number;

  @ApiProperty({ required: false })
  @ValidateNested()
  @Type(() => DimensionsDto)
  @IsOptional()
  dimensions?: DimensionsDto;
}
