# E-Commerce Backend API

A complete, production-ready e-commerce backend built with NestJS, TypeORM, PostgreSQL, Redis, and Stripe.

## 🚀 Features

- **Authentication & Authorization**: JWT-based auth with role-based access control (Admin/Customer)
- **Products Management**: Full CRUD with pagination, filtering, search, and Redis caching
- **Shopping Cart**: Add/remove items, update quantities with stock validation
- **Orders**: Order creation, status tracking, and management
- **Payments**: Stripe integration with webhook support
- **API Documentation**: Swagger/OpenAPI documentation
- **Database**: PostgreSQL with TypeORM
- **Caching**: Redis for performance optimization
- **Validation**: Class-validator for request validation
- **Security**: Rate limiting, CORS, password hashing with bcrypt

## 📋 Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- Redis (v6 or higher)
- npm or yarn

## 🛠️ Installation

1. **Clone and navigate to the project:**
```bash
cd ecommerce-backend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
Copy `.env` file and update with your credentials:
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password_here
DB_DATABASE=ecommerce_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=7d

# Stripe
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_CURRENCY=usd
```

4. **Set up the database:**
```bash
# Using Docker (Recommended)
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=your_password_here \
  -e POSTGRES_DB=ecommerce_db \
  -p 5432:5432 \
  postgres:14

docker run -d \
  --name redis \
  -p 6379:6379 \
  redis:latest
```

5. **Run migrations (auto-sync in development):**
The database schema will be automatically created when you start the app in development mode.

## 🏃 Running the Application

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

The server will start on `http://localhost:3000`
API Documentation: `http://localhost:3000/api/docs`

## 📚 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login user

### Products
- `GET /api/v1/products` - Get all products (with filters & pagination)
- `GET /api/v1/products/:id` - Get product by ID
- `GET /api/v1/products/slug/:slug` - Get product by slug
- `POST /api/v1/products` - Create product (Admin only)
- `PATCH /api/v1/products/:id` - Update product (Admin only)
- `DELETE /api/v1/products/:id` - Delete product (Admin only)

### Cart
- `GET /api/v1/cart` - Get user cart
- `POST /api/v1/cart/items` - Add item to cart
- `PATCH /api/v1/cart/items/:itemId` - Update cart item quantity
- `DELETE /api/v1/cart/items/:itemId` - Remove item from cart
- `DELETE /api/v1/cart` - Clear cart

### Orders
- `POST /api/v1/orders` - Create order from cart
- `GET /api/v1/orders` - Get user orders
- `GET /api/v1/orders/:id` - Get order by ID
- `PATCH /api/v1/orders/:id/status` - Update order status (Admin only)
- `PATCH /api/v1/orders/:id/payment-status` - Update payment status (Admin only)

### Payments
- `POST /api/v1/payments/create-intent/:orderId` - Create Stripe payment intent
- `POST /api/v1/payments/webhook` - Stripe webhook endpoint

## 🧪 Testing the API

### 1. Register a User
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }'
```

Save the token from the response.

### 3. Create a Product (Admin)
```bash
curl -X POST http://localhost:3000/api/v1/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Wireless Headphones",
    "description": "Premium noise-canceling headphones",
    "price": 99.99,
    "sku": "WH-1000",
    "stockQuantity": 100
  }'
```

### 4. Get Products
```bash
curl http://localhost:3000/api/v1/products
```

## 🔐 Creating an Admin User

After registering a user, update their role in the database:

```sql
psql -d ecommerce_db
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

## 📁 Project Structure

```
src/
├── common/           # Shared utilities
│   ├── decorators/   # Custom decorators
│   └── guards/       # Auth guards
├── config/           # Configuration files
├── database/
│   └── entities/     # TypeORM entities
├── modules/
│   ├── auth/         # Authentication module
│   ├── products/     # Products module
│   ├── cart/         # Shopping cart module
│   ├── orders/       # Orders module
│   └── payments/     # Payments module
├── app.module.ts     # Root module
└── main.ts           # Application entry point
```

## 🐛 Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running: `docker ps` or `pg_isready`
- Verify credentials in `.env` match your database
- Create database if it doesn't exist: `createdb -U postgres ecommerce_db`

### Redis Connection Issues
- Check Redis is running: `redis-cli ping` (should return PONG)
- Verify Redis configuration in `.env`

### Port Already in Use
- Change PORT in `.env` or kill the process: `lsof -ti:3000 | xargs kill -9`

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USERNAME` | Database username | `postgres` |
| `DB_PASSWORD` | Database password | - |
| `DB_DATABASE` | Database name | `ecommerce_db` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `JWT_SECRET` | JWT secret key | - |
| `JWT_EXPIRATION` | JWT expiration | `7d` |
| `STRIPE_SECRET_KEY` | Stripe secret key | - |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | - |

## 🔒 Security Features

- Password hashing with bcrypt
- JWT authentication
- Role-based access control
- Rate limiting (10 requests/minute)
- Input validation
- CORS enabled

## 📖 API Documentation

Visit `http://localhost:3000/api/docs` for interactive Swagger documentation.

## 🚀 Deployment

1. Set `NODE_ENV=production` in `.env`
2. Update database credentials
3. Set strong `JWT_SECRET`
4. Configure production Stripe keys
5. Build: `npm run build`
6. Start: `npm run start:prod`

## 📄 License

This project is licensed under the UNLICENSED license.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For issues and questions, please check the troubleshooting guide or open an issue.

---

**Built with ❤️ using NestJS**
