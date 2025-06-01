import { Router, Request, Response } from 'express';
import { runPdfAgent } from '../ai-agent/ai-agent';

const router = Router();

interface QueryRequest {
    question: string;
    thread?: string;
}

// POST /agent/query
router.post('/query', async (req: Request, res: Response): Promise<void> => {
    try {
        const { question, thread = "shadow" }: QueryRequest = req.body;

        if (!question || typeof question !== 'string') {
            res.status(400).json({
                error: 'Se requiere una pregunta válida en el campo "question"'
            });
            return;
        }

        const result = await runPdfAgent(question, thread);

        res.json({
            success: true,
            result
        });

    } catch (error) {
        console.error("Error processing agent query:", error);

        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido del agente'
        });
    }
});

export default router;