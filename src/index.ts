// src/index.ts
import express, { ErrorRequestHandler } from 'express';
import path from 'path';
import cors from 'cors';

import uploadsRouter from './backend/routes/uploads';
import chatRouter from './backend/routes/chat';

const app = express();
const PORT = process.env.PORT || 3000;

// 1) Middlewares básicos
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2) Sirvo archivos estáticos con otro prefijo (pueva /static/uploads)
const uploadsFolder = path.join(__dirname, 'backend/uploads');
console.log('Sirviendo uploads desde:', uploadsFolder);
app.use('/static/uploads', express.static(uploadsFolder));

// 3) Rutas de API
app.use('/uploads', uploadsRouter);
app.use('/chat', chatRouter);

// 4) Error handler
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  if (err instanceof Error) {
    res.status(500).json({ message: err.message });
  } else {
    res.status(500).json({ message: 'Error desconocido en el servidor' });
  }
};
app.use(errorHandler);

// 5) Arrancar servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});