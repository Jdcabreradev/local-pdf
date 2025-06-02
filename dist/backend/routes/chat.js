"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ai_agent_1 = require("../ai-agent/ai-agent");
const router = (0, express_1.Router)();
// POST /agent/query
router.post('/query', async (req, res) => {
    try {
        const { question, thread = "shadow" } = req.body;
        if (!question || typeof question !== 'string') {
            res.status(400).json({
                error: 'Se requiere una pregunta válida en el campo "question"'
            });
            return;
        }
        const result = await (0, ai_agent_1.runPdfAgent)(question, thread);
        res.json({
            success: true,
            result
        });
    }
    catch (error) {
        console.error("Error processing agent query:", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido del agente'
        });
    }
});
exports.default = router;
