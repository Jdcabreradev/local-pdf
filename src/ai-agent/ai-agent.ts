import { RunnableConfig } from "@langchain/core/runnables";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";
import path from "path";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import fs from "fs";
import { Document } from "@langchain/core/documents";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { ChatOllama, OllamaEmbeddings } from "@langchain/ollama";

// ESTADO DEL AGENTE
const PdfAgentState = Annotation.Root({
  filePath: Annotation<string>({
    reducer: (prev: string, next: string) => next,
  }),
  lastModified: Annotation<number>({
    default: () => 0,
    reducer: (prev: number, next: number) => (next !== undefined ? next : prev),
  }),
  pages: Annotation<string[]>({
    default: () => [],
    reducer: (prev: string[], next: string[]) => (next && next.length > 0 ? next : prev),
  }),
  vectorStore: Annotation<any | undefined>({
    default: () => undefined,
    reducer: (prev: any | undefined, next: any | undefined) => (next !== undefined ? next : prev),
  }),
  documents: Annotation<Document[] | undefined>({
    default: () => undefined,
    reducer: (prev: Document[] | undefined, next: Document[] | undefined) => (next !== undefined ? next : prev),
  }),
  query: Annotation<string>({
    default: () => "",
    reducer: (prev: string, next: string) => (next !== undefined ? next : prev),
  }),
  answer: Annotation<string>({
    default: () => "",
    reducer: (prev: string, next: string) => (next !== undefined ? next : prev),
  }),
  shouldSkipProcessing: Annotation<boolean>({
    default: () => false,
    reducer: (prev: boolean, next: boolean) => (next !== undefined ? next : prev),
  }),
  isFirstTime: Annotation<boolean>({
    default: () => true,
    reducer: (prev: boolean, next: boolean) => (next !== undefined ? next : prev),
  }),
});

type PdfAgentStateType = typeof PdfAgentState.State;

// CONFIGURACIÓN
const PDF_PATH = path.resolve(__dirname, "..", "uploads", "currentfile.pdf");

// NODO DE VERIFICACIÓN
export const checkPdf = async (
  state: PdfAgentStateType,
  _config?: RunnableConfig
): Promise<Partial<PdfAgentStateType>> => {
  const filePath = PDF_PATH;
  let stats: fs.Stats;

  try {
    stats = fs.statSync(filePath);
  } catch (e) {
    throw new Error(`Unable to stat file at ${filePath}: ${(e as Error).message}`);
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

// NODO DE CARGA
export const loadPdf = async (
  state: PdfAgentStateType,
  _config?: RunnableConfig
): Promise<Partial<PdfAgentStateType>> => {
  const filePath = PDF_PATH;

  const loader = new PDFLoader(filePath);
  const docs: Document[] = await loader.load();
  const rawPages = docs.map((doc) => doc.pageContent);

  // Create documents for vector store
  const documents: Document[] = rawPages.map((pageContent, index) => {
    return new Document({
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

// NODO DE RESPUESTA
export const answerPdf = async (
  state: PdfAgentStateType,
  _config?: RunnableConfig
): Promise<Partial<PdfAgentStateType>> => {
  // Always recreate vector store from documents to avoid serialization issues
  console.log("Creating vector store from cached documents...");

  // Use documents if available, otherwise create from pages
  const docs = state.documents || state.pages.map((pageContent, index) => {
    return new Document({
      pageContent,
      metadata: { page: index + 1 },
    });
  });

  const embeddings = new OllamaEmbeddings({
    model: "nomic-embed-text",
  });

  const vectorStore = await MemoryVectorStore.fromDocuments(docs, embeddings);

  const llm = new ChatOllama({
    model: "llama3.2",
  });

  const prompt = ChatPromptTemplate.fromTemplate(
    `You are a helpful assistant. Use the following context to answer the question.

Context:
{context}

Question: {input}

Answer:`
  );

  const combineDocsChain = await createStuffDocumentsChain({
    llm,
    prompt,
  });

  const retriever = vectorStore.asRetriever();
  const retrievalChain = await createRetrievalChain({
    retriever,
    combineDocsChain,
  });

  const result = await retrievalChain.invoke({ input: state.query });

  // Don't store vectorStore in state, just return the answer
  return {
    answer: result.answer,
  };
};

// LÓGICA CONDICIONAL
const shouldSkipProcessing = (state: PdfAgentStateType): string => {
  return state.shouldSkipProcessing ? "answerPdf" : "loadPdf";
};

// CREACIÓN DEL GRAFO
const checkpointer = new MemorySaver();

const graph = new StateGraph(PdfAgentState)
  .addNode("checkPdf", checkPdf)
  .addNode("loadPdf", loadPdf)
  .addNode("answerPdf", answerPdf)
  .addEdge(START, "checkPdf")
  .addConditionalEdges("checkPdf", shouldSkipProcessing, {
    loadPdf: "loadPdf",
    answerPdf: "answerPdf",
  })
  .addEdge("loadPdf", "answerPdf")
  .addEdge("answerPdf", END);

export const pdfAgentGraph = graph.compile({
  checkpointer,
});

// FUNCIONES HELPER
export const runPdfAgent = async (query: string, threadId: string = "default-thread") => {
  const config = {
    configurable: {
      thread_id: threadId,
    },
  };

  const result = await pdfAgentGraph.invoke({ query }, config);
  return result.answer;
};

export const getThreadState = async (threadId: string = "default-thread") => {
  const config = {
    configurable: {
      thread_id: threadId,
    },
  };

  const state = await pdfAgentGraph.getState(config);
  return state;
};

export const clearThreadState = async (threadId: string = "default-thread") => {
  const config = {
    configurable: {
      thread_id: threadId,
    },
  };

  await pdfAgentGraph.updateState(config, {
    pages: [],
    documents: undefined,
    lastModified: 0,
    shouldSkipProcessing: false,
    isFirstTime: true, // Reset to first time when clearing
  });
};