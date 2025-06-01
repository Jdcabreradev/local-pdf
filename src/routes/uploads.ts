// routes/uploads.ts
import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Directorio donde guardaremos siempre el archivo como "currentfile.pdf"
const UPLOAD_DIR = path.join(__dirname, '../uploads');

// Asegurarnos de que la carpeta exista
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configuración de multer: siempre se llamará al archivo "currentfile.pdf"
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, _file, cb) => {
    cb(null, 'currentfile.pdf');
  }
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    // Validar que sea PDF (MIME type)
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Solo se permiten archivos PDF'));
    }
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // máximo 10MB
  }
});

// POST /uploads
// Ajustamos `req` para que TypeScript sepa que puede tener `file`
router.post(
  '/',
  upload.single('file'),
  (req: Request & { file?: Express.Multer.File }, res: Response) => {
    if (!req.file) {
      res.status(400).json({ message: 'No se recibió ningún archivo' });
      return;
    }

    // Aquí multer ya guardó el archivo en uploads/currentfile.pdf
    res.json({ message: 'Archivo subido y reemplazado con éxito.' });
  }
);

export default router;
