import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus, PaymentStatus } from '../../database/entities/order.entity';
import { OrderItem } from '../../database/entities/order-item.entity';
import { Cart } from '../../database/entities/cart.entity';
import { CartItem } from '../../database/entities/cart-item.entity';
import { Product } from '../../database/entities/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto, UpdatePaymentStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private dataSource: DataSource,
  ) {}

  async create(userId: string, createOrderDto: CreateOrderDto): Promise<Order> {
    const cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items', 'items.product'],
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const orderNumber = this.generateOrderNumber();

    return await this.dataSource.transaction(async (manager) => {
      // Create order
      const order = manager.create(Order, {
        userId,
        orderNumber,
        shippingAddress: createOrderDto.shippingAddress,
        billingAddress: createOrderDto.billingAddress || createOrderDto.shippingAddress,
        notes: createOrderDto.notes,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        subtotal: cart.subtotal,
        tax: cart.tax,
        discount: cart.discount,
        shippingCost: 10.0, // Fixed shipping cost
        total: cart.total + 10.0,
      });

      const savedOrder = await manager.save(Order, order);

      // Create order items and update stock
      const orderItems = await Promise.all(
        cart.items.map(async (cartItem) => {
          const product = await manager.findOne(Product, {
            where: { id: cartItem.productId },
          });

          if (!product) {
            throw new NotFoundException(`Product ${cartItem.productId} not found`);
          }

          if (
            product.trackInventory &&
            product.stockQuantity < cartItem.quantity
          ) {
            throw new BadRequestException(
              `Insufficient stock for product ${product.name}`,
            );
          }

          // Update stock
          if (product.trackInventory) {
            product.stockQuantity -= cartItem.quantity;
            await manager.save(Product, product);
          }

          const orderItem = manager.create(OrderItem, {
            orderId: savedOrder.id,
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            quantity: cartItem.quantity,
            price: cartItem.price,
            subtotal: cartItem.price * cartItem.quantity,
          });

          return manager.save(OrderItem, orderItem);
        }),
      );

      savedOrder.items = orderItems;

      // Clear cart
      await manager.remove(CartItem, cart.items);
      cart.subtotal = 0;
      cart.tax = 0;
      cart.total = 0;
      cart.discount = 0;
      await manager.save(Cart, cart);

      return savedOrder;
    });
  }

  async findAll(userId: string): Promise<Order[]> {
    return this.orderRepository.find({
      where: { userId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId?: string): Promise<Order> {
    const where: any = { id };
    if (userId) {
      where.userId = userId;
    }

    const order = await this.orderRepository.findOne({
      where,
      relations: ['items', 'items.product'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async updateStatus(
    id: string,
    updateOrderStatusDto: UpdateOrderStatusDto,
  ): Promise<Order> {
    const order = await this.findOne(id);

    order.status = updateOrderStatusDto.status;
    return this.orderRepository.save(order);
  }

  async updatePaymentStatus(
    id: string,
    updatePaymentStatusDto: UpdatePaymentStatusDto,
  ): Promise<Order> {
    const order = await this.findOne(id);

    order.paymentStatus = updatePaymentStatusDto.paymentStatus;

    if (updatePaymentStatusDto.paymentStatus === PaymentStatus.PAID) {
      order.status = OrderStatus.PROCESSING;
    }

    return this.orderRepository.save(order);
  }

  private generateOrderNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `ORD-${timestamp}-${random}`;
  }
}
