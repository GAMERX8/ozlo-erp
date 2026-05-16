import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ClientsModule } from './clients/clients.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  const app = await NestFactory.create(AppModule, {
    // Necesario para recibir raw body en webhooks de Stripe
    rawBody: true,
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Configuración de Swagger para Desarrolladores (/dev)
  const devConfig = new DocumentBuilder()
    .setTitle('ERP API para Desarrolladores')
    .setDescription('Documentación de API dirigida a desarrolladores para la integración de Clientes, Productos y Pedidos. Autenticación mediante API Key.')
    .setVersion('1.0')
    .addApiKey(
      { 
        type: 'apiKey', 
        name: 'x-api-key', 
        in: 'header',
        description: 'Ingresa tu API Key creada en Integraciones y Desarrolladores' 
      }, 
      'x-api-key'
    )
    .build();

  const devDocument = SwaggerModule.createDocument(app, devConfig, {
    include: [ClientsModule, ProductsModule, OrdersModule],
  });
  
  SwaggerModule.setup('dev', app, devDocument, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`📚 Developer Documentation available at: http://localhost:${port}/dev`);
}
bootstrap();
