"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearThreadState = exports.getThreadState = exports.runPdfAgent = exports.pdfAgentGraph = exports.answerPdf = exports.loadPdf = exports.checkPdf = void 0;
const langgraph_1 = require("@langchain/langgraph");
const langgraph_2 = require("@langchain/langgraph");
const path_1 = __importDefault(require("path"));
const pdf_1 = require("@langchain/community/document_loaders/fs/pdf");
const fs_1 = __importDefault(require("fs"));
const documents_1 = require("@langchain/core/documents");
const memory_1 = require("langchain/vectorstores/memory");
const combine_documents_1 = require("langchain/chains/combine_documents");
const prompts_1 = require("@langchain/core/prompts");
const retrieval_1 = require("langchain/chains/retrieval");
const ollama_1 = require("@langchain/ollama");
// ESTADO DEL AGENTE
const PdfAgentState = langgraph_1.Annotation.Root({
    filePath: (0, langgraph_1.Annotation)({
        reducer: (prev, next) => next,
    }),
    lastModified: (0, langgraph_1.Annotation)({
        default: () => 0,
        reducer: (prev, next) => (next !== undefined ? next : prev),
    }),
    pages: (0, langgraph_1.Annotation)({
        default: () => [],
        reducer: (prev, next) => (next && next.length > 0 ? next : prev),
    }),
    vectorStore: (0, langgraph_1.Annotation)({
        default: () => undefined,
        reducer: (prev, next) => (next !== undefined ? next : prev),
    }),
    documents: (0, langgraph_1.Annotation)({
        default: () => undefined,
        reducer: (prev, next) => (next !== undefined ? next : prev),
    }),
    query: (0, langgraph_1.Annotation)({
        default: () => "",
        reducer: (prev, next) => (next !== undefined ? next : prev),
    }),
    answer: (0, langgraph_1.Annotation)({
        default: () => "",
        reducer: (prev, next) => (next !== undefined ? next : prev),
    }),
    shouldSkipProcessing: (0, langgraph_1.Annotation)({
        default: () => false,
        reducer: (prev, next) => (next !== undefined ? next : prev),
    }),
    isFirstTime: (0, langgraph_1.Annotation)({
        default: () => true,
        reducer: (prev, next) => (next !== undefined ? next : prev),
    }),
});
// CONFIGURACIÓN
const PDF_PATH = path_1.default.resolve(__dirname, "..", "uploads", "currentfile.pdf");
// NODO DE VERIFICACIÓN
const checkPdf = async (state, _config) => {
    const filePath = PDF_PATH;
    let stats;
    try {
        stats = fs_1.default.statSync(filePath);
    }
    catch (e) {
        throw new Error(`Unable to stat file at ${filePath}: ${e.message}`);
    }
    const mtimeMs = stats.mtimeMs;
    // If it's the first time, we need to process
    if (state.isFirstTime) {
        console.log("First time reading PDF, processing...");
        return {
            shouldSkipProcessing: false,
            lastModified: mtimeMs,
            isFirstTime: false,
        };
    }
    // If file hasn't changed and we have existing data, skip processing
    if (mtimeMs === state.lastModified && state.documents && state.documents.length > 0) {
        console.log("PDF unchanged, skipping processing...");
        return { shouldSkipProcessing: true };
    }
    // File has changed, need to process
    console.log("PDF changed, processing...");
    return {
        shouldSkipProcessing: false,
        lastModified: mtimeMs,
    };
};
exports.checkPdf = checkPdf;
// NODO DE CARGA
const loadPdf = async (state, _config) => {
    const filePath = PDF_PATH;
    const loader = new pdf_1.PDFLoader(filePath);
    const docs = await loader.load();
    const rawPages = docs.map((doc) => doc.pageContent);
    // Create documents for vector store
    const documents = rawPages.map((pageContent, index) => {
        return new documents_1.Document({
            pageContent,
            metadata: { page: index + 1 },
        });
    });
    console.log(`Loaded ${rawPages.length} pages from PDF`);
    return {
        pages: rawPages,
        documents,
    };
};
exports.loadPdf = loadPdf;
// NODO DE RESPUESTA
const answerPdf = async (state, _config) => {
    // Always recreate vector store from documents to avoid serialization issues
    console.log("Creating vector store from cached documents...");
    // Use documents if available, otherwise create from pages
    const docs = state.documents || state.pages.map((pageContent, index) => {
        return new documents_1.Document({
            pageContent,
            metadata: { page: index + 1 },
        });
    });
    const embeddings = new ollama_1.OllamaEmbeddings({
        model: "nomic-embed-text",
        baseUrl: "host.docker.internal:11434"
    });
    const vectorStore = await memory_1.MemoryVectorStore.fromDocuments(docs, embeddings);
    const llm = new ollama_1.ChatOllama({
        model: "llama3.2",
        baseUrl: "host.docker.internal:11434"
    });
    const prompt = prompts_1.ChatPromptTemplate.fromTemplate(`You are a helpful assistant. Use the following context to answer the question.

Context:
{context}

Question: {input}

Answer:`);
    const combineDocsChain = await (0, combine_documents_1.createStuffDocumentsChain)({
        llm,
        prompt,
    });
    const retriever = vectorStore.asRetriever();
    const retrievalChain = await (0, retrieval_1.createRetrievalChain)({
        retriever,
        combineDocsChain,
    });
    const result = await retrievalChain.invoke({ input: state.query });
    // Don't store vectorStore in state, just return the answer
    return {
        answer: result.answer,
    };
};
exports.answerPdf = answerPdf;
// LÓGICA CONDICIONAL
const shouldSkipProcessing = (state) => {
    return state.shouldSkipProcessing ? "answerPdf" : "loadPdf";
};
// CREACIÓN DEL GRAFO
const checkpointer = new langgraph_2.MemorySaver();
const graph = new langgraph_1.StateGraph(PdfAgentState)
    .addNode("checkPdf", exports.checkPdf)
    .addNode("loadPdf", exports.loadPdf)
    .addNode("answerPdf", exports.answerPdf)
    .addEdge(langgraph_1.START, "checkPdf")
    .addConditionalEdges("checkPdf", shouldSkipProcessing, {
    loadPdf: "loadPdf",
    answerPdf: "answerPdf",
})
    .addEdge("loadPdf", "answerPdf")
    .addEdge("answerPdf", langgraph_1.END);
exports.pdfAgentGraph = graph.compile({
    checkpointer,
});
// FUNCIONES HELPER
const runPdfAgent = async (query, threadId = "default-thread") => {
    const config = {
        configurable: {
            thread_id: threadId,
        },
    };
    const result = await exports.pdfAgentGraph.invoke({ query }, config);
    return result.answer;
};
exports.runPdfAgent = runPdfAgent;
const getThreadState = async (threadId = "default-thread") => {
    const config = {
        configurable: {
            thread_id: threadId,
        },
    };
    const state = await exports.pdfAgentGraph.getState(config);
    return state;
};
exports.getThreadState = getThreadState;
const clearThreadState = async (threadId = "default-thread") => {
    const config = {
        configurable: {
            thread_id: threadId,
        },
    };
    await exports.pdfAgentGraph.updateState(config, {
        pages: [],
        documents: undefined,
        lastModified: 0,
        shouldSkipProcessing: false,
        isFirstTime: true, // Reset to first time when clearing
    });
};
exports.clearThreadState = clearThreadState;
