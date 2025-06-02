"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes/uploads.ts
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
// Directorio donde guardaremos siempre el archivo como "currentfile.pdf"
const UPLOAD_DIR = path_1.default.join(__dirname, '../uploads');
// Asegurarnos de que la carpeta exista
if (!fs_1.default.existsSync(UPLOAD_DIR)) {
    fs_1.default.mkdirSync(UPLOAD_DIR, { recursive: true });
}
// Configuración de multer: siempre se llamará al archivo "currentfile.pdf"
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (_req, _file, cb) => {
        cb(null, 'currentfile.pdf');
    }
});
const upload = (0, multer_1.default)({
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
router.post('/', upload.single('file'), (req, res) => {
    if (!req.file) {
        res.status(400).json({ message: 'No se recibió ningún archivo' });
        return;
    }
    // Aquí multer ya guardó el archivo en uploads/currentfile.pdf
    res.json({ message: 'Archivo subido y reemplazado con éxito.' });
});
exports.default = router;
