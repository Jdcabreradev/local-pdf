"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const uploads_1 = __importDefault(require("./backend/routes/uploads"));
const chat_1 = __importDefault(require("./backend/routes/chat"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// 1) Middlewares básicos
app.use((0, cors_1.default)({
    origin: '*', // Puedes limitarlo a 'http://localhost' si quieres
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// 2) Rutas de API
app.use('/uploads', uploads_1.default);
app.use('/chat', chat_1.default);
// 3) Error handler
const errorHandler = (err, _req, res, _next) => {
    console.error(err);
    if (err instanceof Error) {
        res.status(500).json({ message: err.message });
    }
    else {
        res.status(500).json({ message: 'Error desconocido en el servidor' });
    }
};
app.use(errorHandler);
// 4) Arrancar servidor
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
