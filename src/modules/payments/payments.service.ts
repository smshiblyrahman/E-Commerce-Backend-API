import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { Order, PaymentStatus, OrderStatus } from '../../database/entities/order.entity';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    private configService: ConfigService,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not defined');
    }
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-12-15.clover',
    });
  }

  async createPaymentIntent(orderId: string): Promise<{
    clientSecret: string;
    paymentIntentId: string;
  }> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Order is already paid');
    }

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(order.total * 100), // Convert to cents
      currency: this.configService.get<string>('STRIPE_CURRENCY') || 'usd',
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
    });

    // Save payment intent ID to order
    order.stripePaymentIntentId = paymentIntent.id;
    await this.orderRepository.save(order);

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
    };
  }

  async handleWebhook(payload: Buffer, signature: string): Promise<void> {
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret!,
      );
    } catch (err) {
      throw new BadRequestException(`Webhook signature verification failed: ${err.message}`);
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  private async handlePaymentSuccess(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    const order = await this.orderRepository.findOne({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (!order) {
      console.error(`Order not found for payment intent: ${paymentIntent.id}`);
      return;
    }

    order.paymentStatus = PaymentStatus.PAID;
    order.status = OrderStatus.PROCESSING;
    await this.orderRepository.save(order);
  }

  private async handlePaymentFailure(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    const order = await this.orderRepository.findOne({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (!order) {
      console.error(`Order not found for payment intent: ${paymentIntent.id}`);
      return;
    }

    order.paymentStatus = PaymentStatus.FAILED;
    await this.orderRepository.save(order);
  }
}
