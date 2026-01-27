import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Category } from './category.entity';
import { CartItem } from './cart-item.entity';
import { OrderItem } from './order-item.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  compareAtPrice: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  cost: number;

  @Column({ unique: true })
  sku: string;

  @Column('simple-array', { nullable: true })
  images: string[];

  @Column({ default: 0 })
  stockQuantity: number;

  @Column({ default: 10 })
  lowStockThreshold: number;

  @Column({ default: true })
  trackInventory: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isFeatured: boolean;

  @ManyToOne(() => Category, (category) => category.products, { nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column({ nullable: true })
  categoryId: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  weight: number;

  @Column('jsonb', { nullable: true })
  dimensions: {
    length: number;
    width: number;
    height: number;
  };

  @OneToMany(() => CartItem, (cartItem) => cartItem.product)
  cartItems: CartItem[];

  @OneToMany(() => OrderItem, (orderItem) => orderItem.product)
  orderItems: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
