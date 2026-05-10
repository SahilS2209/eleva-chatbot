"""
AI Agent Service using Google ADK (Agent Development Kit) with Gemini.
Implements an agentic chatbot with RAG, tool use, and escalation capabilities.
"""
import os
from typing import Optional
from dotenv import load_dotenv
from google import genai
from google.genai import types
from app.services.knowledge_service import KnowledgeService
from app.database import (
    tickets_collection, conversations_collection, messages_collection
)
from datetime import datetime
from bson import ObjectId

load_dotenv()

# Initialize Google GenAI client
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
_client = None


def get_client():
    global _client
    if _client is None and GOOGLE_API_KEY:
        _client = genai.Client(api_key=GOOGLE_API_KEY)
    return _client

knowledge_service = KnowledgeService()

# System prompt for the AI agent
SYSTEM_PROMPT = """You are Eleva, an AI-powered customer support agent for Elements HR Services, Gurgaon. Your name is Eleva. Your role is to help customers with their HR-related questions and issues professionally and efficiently.

## About Elements HR Services:
- We provide payroll management, recruitment, compliance, onboarding, HR policy drafting, and background verification services.
- Located in Sector 44, Gurgaon, Haryana.
- Working hours: Monday to Saturday, 9 AM to 6 PM.

## Guidelines:
1. Be polite, professional, and empathetic
2. Answer questions accurately based on the knowledge base provided
3. If you don't know the answer, say so honestly - DO NOT make up information
4. If the customer is frustrated or the issue is complex, offer to escalate to a human agent
5. When creating tickets, gather all necessary information first
6. Keep responses concise but helpful
7. Always ask clarifying questions if the customer's request is unclear
8. NEVER use markdown formatting (no **, no ##, no bullet points with *). Use plain text only. Use numbered lists (1. 2. 3.) or dashes (- ) for lists. Keep responses clean and readable as plain text.

## Available Actions:
- Search the knowledge base for relevant information about our services, policies, and FAQs
- Create support tickets for issues that need tracking
- Escalate to a human agent when needed

## Important:
- Never share sensitive internal information
- Never make promises about pricing without checking the knowledge base
- Always confirm actions before taking them
- For pricing queries, refer to the knowledge base or suggest contacting the sales team
"""


# Define tools for the agent
def get_tools():
    """Define the tools available to the agent."""
    search_kb = types.FunctionDeclaration(
        name="search_knowledge_base",
        description="Search the company knowledge base for relevant information to answer customer questions. Use this when you need to find specific product info, policies, or procedures.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "query": types.Schema(
                    type=types.Type.STRING,
                    description="The search query to find relevant information"
                )
            },
            required=["query"]
        )
    )

    create_ticket = types.FunctionDeclaration(
        name="create_support_ticket",
        description="Create a support ticket for issues that need tracking or follow-up. Use this when the customer has a specific issue that needs resolution.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "title": types.Schema(
                    type=types.Type.STRING,
                    description="Brief title describing the issue"
                ),
                "description": types.Schema(
                    type=types.Type.STRING,
                    description="Detailed description of the issue"
                ),
                "priority": types.Schema(
                    type=types.Type.STRING,
                    description="Priority level: low, medium, high, or urgent",
                    enum=["low", "medium", "high", "urgent"]
                )
            },
            required=["title", "description", "priority"]
        )
    )

    escalate = types.FunctionDeclaration(
        name="escalate_to_human",
        description="Escalate the conversation to a human support agent. Use this when the issue is too complex, the customer is frustrated, or you cannot resolve the issue.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "reason": types.Schema(
                    type=types.Type.STRING,
                    description="Reason for escalation"
                )
            },
            required=["reason"]
        )
    )

    return types.Tool(function_declarations=[search_kb, create_ticket, escalate])


async def handle_function_call(function_call, conversation_id: str) -> str:
    """Handle function calls from the AI agent."""
    name = function_call.name
    args = dict(function_call.args) if function_call.args else {}

    if name == "search_knowledge_base":
        query = args.get("query", "")
        results = await knowledge_service.search(query, n_results=3)
        if results:
            context = "\n\n".join([
                f"**{r['metadata'].get('title', 'Document')}**:\n{r['content']}"
                for r in results
            ])
            return f"Knowledge Base Results:\n{context}"
        return "No relevant information found in the knowledge base."

    elif name == "create_support_ticket":
        ticket_doc = {
            "title": args.get("title", "Support Ticket"),
            "description": args.get("description", ""),
            "priority": args.get("priority", "medium"),
            "status": "open",
            "conversation_id": conversation_id,
            "customer_email": None,
            "assigned_agent_id": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "resolved_at": None,
        }
        result = await tickets_collection.insert_one(ticket_doc)
        ticket_id = str(result.inserted_id)[-6:].upper()
        return f"Your support ticket has been created successfully (Ticket ID: TKT-{ticket_id}). A support agent will follow up on this issue."

    elif name == "escalate_to_human":
        reason = args.get("reason", "Customer requested human agent")
        await conversations_collection.update_one(
            {"_id": ObjectId(conversation_id)},
            {
                "$set": {
                    "status": "escalated",
                    "updated_at": datetime.utcnow(),
                }
            }
        )
        return f"Conversation escalated to a human agent. Reason: {reason}. A support agent will be with you shortly."

    return "Unknown function called."


async def get_chat_response(
    message: str,
    conversation_id: str,
    conversation_history: list = None,
) -> str:
    """
    Get AI response using Google Gemini with function calling.
    Implements the agentic loop - the AI can call tools and reason about results.
    """
    if not GOOGLE_API_KEY:
        return "AI service is not configured. Please set the GOOGLE_API_KEY environment variable."

    client = get_client()
    if not client:
        return "AI service is not configured. Please set the GOOGLE_API_KEY environment variable."

    # Build conversation contents
    contents = []

    # Add conversation history
    if conversation_history:
        for msg in conversation_history[-10:]:  # Last 10 messages for context
            role = "user" if msg["role"] == "user" else "model"
            contents.append(types.Content(
                role=role,
                parts=[types.Part.from_text(text=msg["content"])]
            ))

    # Add current message
    contents.append(types.Content(
        role="user",
        parts=[types.Part.from_text(text=message)]
    ))

    # Configure generation
    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        tools=[get_tools()],
        temperature=0.3,  # Lower temperature for more factual responses
        max_output_tokens=1024,
    )

    try:
        # Agentic loop - allow multiple tool calls
        max_iterations = 5
        for _ in range(max_iterations):
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=contents,
                config=config,
            )

            # Check if the response has function calls
            if response.candidates and response.candidates[0].content.parts:
                parts = response.candidates[0].content.parts
                has_function_call = False

                for part in parts:
                    if part.function_call:
                        has_function_call = True
                        # Execute the function
                        result = await handle_function_call(
                            part.function_call, conversation_id
                        )

                        # Add the model's response and function result to contents
                        contents.append(response.candidates[0].content)
                        contents.append(types.Content(
                            role="user",
                            parts=[types.Part.from_function_response(
                                name=part.function_call.name,
                                response={"result": result}
                            )]
                        ))
                        break

                if not has_function_call:
                    # No function call, return the text response
                    text_parts = [p.text for p in parts if p.text]
                    return " ".join(text_parts) if text_parts else "I'm sorry, I couldn't generate a response."

            else:
                return "I'm sorry, I couldn't generate a response. Please try again."

        # If we hit max iterations, return last response
        if response.candidates and response.candidates[0].content.parts:
            text_parts = [p.text for p in response.candidates[0].content.parts if p.text]
            return " ".join(text_parts) if text_parts else "I apologize, but I'm having trouble processing your request. Would you like me to connect you with a human agent?"

        return "I apologize, but I'm having trouble processing your request. Would you like me to connect you with a human agent?"

    except Exception as e:
        print(f"AI Agent Error: {str(e)}")
        return f"I'm experiencing a technical issue. Please try again or type 'escalate' to speak with a human agent."
