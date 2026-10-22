import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ExpressAdapter } from '@nestjs/platform-express';
import express = require('express');
import { Request, Response } from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function createApp(expressInstance?: express.Express) {
  const app = expressInstance
    ? await NestFactory.create(AppModule, new ExpressAdapter(expressInstance))
    : await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global pipes, filters and interceptors
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger OpenAPI configuration
  const config = new DocumentBuilder()
    .setTitle('«Nizolarni muqobil hal etish» elektron platformasi — ADM API')
    .setDescription(
      `Administrator paneli (ADM) moduli uchun ishlab chiqilgan rasmiy REST API.
      
Ushbu modul orqali quyidagi funksiyalar boshqariladi:
- Tashkilotlar va ierarxiya (FT-ADM-01 / ADM-01)
- Foydalanuvchilar va rollar (FT-ADM-02, FT-ADM-03 / ADM-02)
- Spravochniklar (FT-ADM-05 / ADM-03)
- Audit jurnali (FT-ADM-06 / ADM-04)
- Tizim sozlamalari (FT-ADM-07 / ADM-05)
- Kontent boshqaruvi (FT-ADM-04 / ADM-06)
- Autentifikatsiya (AUTH) moduli`,
    )
    .setVersion('0.2.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Tizimga kirish tokenini kiriting',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      filter: true,
      docExpansion: 'list',
    },
    customSiteTitle: 'Nizolarni hal qilish — ADM API Docs',
  });

  return app;
}

let appPromise: ReturnType<typeof createApp> | undefined;

async function handler(req: Request, res: Response) {
  const app = await (appPromise ??= createApp(express()));
  const instance = app.getHttpAdapter().getInstance();
  return instance(req, res);
}

export default handler;

// Keep `nest start` and `node dist/main` usable for local and non-Vercel runs.
if (require.main === module) {
  createApp().then(async (app) => {
    const port = process.env.PORT || 3000;
    await app.listen(port);
  console.log(`\n======================================================`);
  console.log(`🚀 Administrator paneli (ADM) serveri ishga tushdi:`);
  console.log(`🌐 Server manzili:  http://localhost:${port}`);
  console.log(`📚 Swagger OpenAPI:  http://localhost:${port}/api/docs`);
  console.log(`======================================================\n`);
  });
}
