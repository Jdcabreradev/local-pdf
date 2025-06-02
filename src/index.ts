// src/index.ts
import express, { ErrorRequestHandler } from 'express';
import path from 'path';
import cors from 'cors';

import uploadsRouter from './backend/routes/uploads';
import chatRouter from './backend/routes/chat';

const app = express();
const PORT = process.env.PORT || 3000;

// 1) Middlewares básicos
app.use(cors({
  origin: '*', // Puedes limitarlo a 'http://localhost' si quieres
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2) Rutas de API
app.use('/uploads', uploadsRouter);
app.use('/chat', chatRouter);

// 3) Error handler
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  if (err instanceof Error) {
    res.status(500).json({ message: err.message });
  } else {
    res.status(500).json({ message: 'Error desconocido en el servidor' });
  }
};
app.use(errorHandler);

// 4) Arrancar servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});