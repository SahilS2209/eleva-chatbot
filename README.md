# AI-Powered Customer Support Chatbot Platform

Full-Stack AI-Powered Customer Support Agentic Chatbot System

## Architecture

- **Frontend**: Next.js 14 (App Router) with Tailwind CSS
- **Backend**: Python FastAPI with WebSocket support
- **Database**: MongoDB
- **AI Engine**: Google ADK (Agent Development Kit) with Gemini
- **Auth**: JWT-based authentication
- **Deployment**: Docker & Docker Compose

## Features

- 🤖 Agentic AI chatbot with RAG (Retrieval-Augmented Generation)
- 📚 Knowledge base management (upload documents)
- 🔄 Human agent escalation
- 🎫 Ticket creation and management
- 📊 Analytics dashboard
- 💬 Real-time chat via WebSocket
- 🔐 Admin and agent authentication
- 🐳 Dockerized deployment

## Project Structure

```
├── frontend/          # Next.js 14 application
├── backend/           # FastAPI application
├── docker-compose.yml # Docker orchestration
└── README.md
```

## Quick Start

```bash
# Start all services
docker-compose up --build

# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

## Environment Variables

Copy `.env.example` to `.env` and fill in:
- `GOOGLE_API_KEY` - Google AI API key (free tier from ai.google.dev)
- `MONGODB_URL` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT tokens
- `DATABASE_NAME` - MongoDB database name (default: chatbot_platform)
