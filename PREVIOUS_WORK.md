# PREVIOUS_WORK.md

## Vera – AI-Powered Financial Servicing Agent

**Live Demo:** https://amex-ai.vercel.app/

Vera is an AI-powered financial servicing agent designed to handle customer banking requests through conversational interactions. It supports workflows such as fee-waiver requests, credit-limit increase requests and card replacements. The system combines LLM-based conversations, Retrieval-Augmented Generation (RAG), deterministic policy validation and human-in-the-loop escalation to make servicing workflows more reliable and controlled.

**AI Tech Stack:** Python, LangGraph, Llama 3.3 70B (Groq), GPT-4o, ChromaDB, RAG and prompt engineering.

### AI Capabilities

- **Retrieval-Augmented Generation:** Retrieves relevant banking and compliance policies from ChromaDB and supplies them as context to the LLM before it processes customer requests.
- **Agent Orchestration:** Uses LangGraph to structure the agent workflow, manage processing states and coordinate the steps involved in handling customer requests.
- **Deterministic Tool Execution:** Separates language-model responsibilities from financial decisions. The LLM handles intent classification, parameter extraction and conversational responses, while predefined Python functions perform eligibility checks, calculations and controlled actions.
- **Human-in-the-Loop Escalation:** Supports escalation of high-frustration conversations and unauthorized requests to a human supervisor, allowing a human agent to take over with the conversation context and intent information.
- **Multilingual Support:** Supports multilingual voice interactions through Sarvam AI, with language information carried through the agent workflow to generate responses in the appropriate language.
- **Compliance and Auditability:** Integrates policy-grounded decision-making with an audit pipeline that records agent actions, compliance decisions and retrieved policy context.

### My Contribution

I primarily worked on the AI and agent development side of Vera, particularly the RAG pipeline and agent workflow.

- Worked on the RAG pipeline, including processing policy documents, chunking, embeddings, storing vectors in ChromaDB and retrieving relevant context through similarity search.
- Worked with LangGraph to structure the agent's workflow and incorporate retrieved policy context into its processing.
- Focused on grounding LLM responses in retrieved banking policies instead of relying entirely on general model knowledge.
- Worked on integrating deterministic policy checks into the AI workflow to keep financial decisions governed by predefined rules.
- Worked on agent instructions and prompt behaviour for handling customer requests, policy restrictions and escalation scenarios.

### Team Contributions

My teammates worked on the frontend, backend, database infrastructure and voice interface, including speech-to-text and text-to-speech integration. The supervisor dashboard and supporting infrastructure were also part of the overall project.

### What I Would Improve

I would build a dedicated RAG evaluation pipeline with a test dataset of banking-policy questions. This would help measure retrieval relevance, identify missing policy context and evaluate whether the agent consistently uses the correct information before responding.

