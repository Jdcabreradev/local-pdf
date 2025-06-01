// src/index.ts
import express, { ErrorRequestHandler } from 'express';
import path from 'path';
import cors from 'cors';
// Cambiamos la importación para que apunte a ../routes/uploads
import uploadsRouter from './routes/uploads';
import chatRouter from './routes/chat';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsear JSON
app.use(cors());
app.use(express.json());


// Servir la carpeta uploads de forma estática (opcional)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Registrar rutas
// Ahora apunta correctamente a ../routes/uploads
app.use('/uploads', uploadsRouter);
app.use('/chat', chatRouter);

// Error-handler tipado como ErrorRequestHandler
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);

  if (err instanceof Error) {
    res.status(500).json({ message: err.message });
  } else {
    res.status(500).json({ message: 'Error desconocido en el servidor' });
  }
};

app.use(errorHandler);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
