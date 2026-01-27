import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cart } from '../../database/entities/cart.entity';
import { CartItem } from '../../database/entities/cart-item.entity';
import { Product } from '../../database/entities/product.entity';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private cartItemRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private dataSource: DataSource,
  ) {}

  async getOrCreateCart(userId: string): Promise<Cart> {
    let cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items', 'items.product'],
    });

    if (!cart) {
      cart = this.cartRepository.create({ userId });
      cart = await this.cartRepository.save(cart);
    }

    return cart;
  }

  async getCart(userId: string): Promise<Cart> {
    const cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items', 'items.product'],
    });

    if (!cart) {
      return this.getOrCreateCart(userId);
    }

    await this.calculateTotals(cart);
    return cart;
  }

  async addItem(userId: string, addCartItemDto: AddCartItemDto): Promise<Cart> {
    const { productId, quantity } = addCartItemDto;

    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.isActive) {
      throw new BadRequestException('Product is not available');
    }

    if (
      product.trackInventory &&
      product.stockQuantity < quantity
    ) {
      throw new BadRequestException('Insufficient stock');
    }

    const cart = await this.getOrCreateCart(userId);

    const existingItem = cart.items?.find(
      (item) => item.productId === productId,
    );

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;

      if (
        product.trackInventory &&
        product.stockQuantity < newQuantity
      ) {
        throw new BadRequestException('Insufficient stock');
      }

      existingItem.quantity = newQuantity;
      existingItem.price = product.price;
      await this.cartItemRepository.save(existingItem);
    } else {
      const cartItem = this.cartItemRepository.create({
        cartId: cart.id,
        productId,
        quantity,
        price: product.price,
      });

      await this.cartItemRepository.save(cartItem);
    }

    return this.getCart(userId);
  }

  async updateItem(
    userId: string,
    itemId: string,
    updateCartItemDto: UpdateCartItemDto,
  ): Promise<Cart> {
    const cart = await this.getCart(userId);

    const item = cart.items?.find((i) => i.id === itemId);

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    const product = await this.productRepository.findOne({
      where: { id: item.productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (
      product.trackInventory &&
      product.stockQuantity < updateCartItemDto.quantity
    ) {
      throw new BadRequestException('Insufficient stock');
    }

    item.quantity = updateCartItemDto.quantity;
    await this.cartItemRepository.save(item);

    return this.getCart(userId);
  }

  async removeItem(userId: string, itemId: string): Promise<Cart> {
    const cart = await this.getCart(userId);

    const item = cart.items?.find((i) => i.id === itemId);

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await this.cartItemRepository.remove(item);

    return this.getCart(userId);
  }

  async clearCart(userId: string): Promise<void> {
    const cart = await this.getCart(userId);

    if (cart.items && cart.items.length > 0) {
      await this.cartItemRepository.remove(cart.items);
    }

    cart.subtotal = 0;
    cart.tax = 0;
    cart.total = 0;
    cart.discount = 0;

    await this.cartRepository.save(cart);
  }

  private async calculateTotals(cart: Cart): Promise<void> {
    if (!cart.items || cart.items.length === 0) {
      cart.subtotal = 0;
      cart.tax = 0;
      cart.total = 0;
      cart.discount = 0;
      await this.cartRepository.save(cart);
      return;
    }

    const subtotal = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const tax = subtotal * 0.1; // 10% tax
    const total = subtotal + tax - cart.discount;

    cart.subtotal = subtotal;
    cart.tax = tax;
    cart.total = total;

    await this.cartRepository.save(cart);
  }
}
