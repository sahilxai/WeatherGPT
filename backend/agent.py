import os
import sys
import re
from typing import List, Dict, Any, Optional

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from langchain_groq import ChatGroq
try:
    from langchain.agents import AgentExecutor, create_tool_calling_agent
except ImportError:
    from langchain_classic.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from backend.config import GROQ_API_KEY, GROQ_MODEL
from backend.tools.weather import get_live_weather, get_last_location, clear_last_location, FALLBACK_COORDINATES
from backend.rag.retriever import search_disaster_guidelines

# Register agent tools
TOOLS = [get_live_weather, search_disaster_guidelines]

SYSTEM_PROMPT = """You are WeatherGPT, a direct, concise real-time weather and emergency assistant.

CORE RESPONSE RULES:
1. BE DIRECT, STRAIGHTFORWARD, AND BRIEF. State only the major essentials.
2. For weather queries: State the city's condition, temperature (and feels like), humidity, and wind in 3-4 short bullet points. Do NOT write long paragraphs, unsolicited background essays, or complex data tables unless explicitly asked.
3. For tomorrow/future weather: If future forecast data is unavailable, state current conditions briefly in 1-2 lines. NEVER give lectures about typical climatology, historical averages, or internal API limitations.
4. For disaster/emergency advice: Provide 3-4 high-priority actionable safety bullets immediately.
5. Provide complex or deep data ONLY if the user explicitly asks for detailed explanations.
6. Never expose internal tool names, API technicalities, or system workings to the user.
"""

def create_weather_agent() -> Optional[AgentExecutor]:
    """Initializes and returns the LangChain Tool-Calling Agent using Groq."""
    api_key = GROQ_API_KEY or os.getenv("GROQ_API_KEY", "")
    if not api_key or api_key == "your_groq_api_key_here":
        print("[Agent Warning] GROQ_API_KEY is not set in .env. LLM calls will require API key.")
        return None

    llm = ChatGroq(
        groq_api_key=api_key,
        model_name=GROQ_MODEL,
        temperature=0.2,
        max_retries=2
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    agent = create_tool_calling_agent(llm, TOOLS, prompt)
    return AgentExecutor(
        agent=agent,
        tools=TOOLS,
        verbose=False,
        return_intermediate_steps=True,
        handle_parsing_errors=True
    )

def detect_city_in_text(text: str) -> Optional[str]:
    """Simple heuristic to detect city mentions in text for location detection fallback."""
    for city in FALLBACK_COORDINATES.keys():
        pattern = r"\b" + re.escape(city) + r"\b"
        if re.search(pattern, text, re.IGNORECASE):
            return city
    return None

def execute_agent_query(user_query: str, chat_history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
    """
    Executes the user query through the LangChain agent and returns the synthesized
    response along with geolocation coordinates for the interactive Leaflet map.
    """
    clear_last_location()

    # Format incoming chat history
    formatted_history = []
    if chat_history:
        for msg in chat_history:
            role = msg.get("role", "").lower()
            content = msg.get("content", "")
            if role == "user":
                formatted_history.append(HumanMessage(content=content))
            elif role in ["assistant", "ai"]:
                formatted_history.append(AIMessage(content=content))

    agent_executor = create_weather_agent()

    # Graceful fallback if Groq API key is not configured yet
    if not agent_executor:
        lower_q = user_query.lower()
        detected_city = detect_city_in_text(user_query)

        if "weather" in lower_q or "temperature" in lower_q or detected_city:
            city_to_query = detected_city if detected_city else user_query.split()[-1].strip("?.,")
            weather_res = get_live_weather.invoke({"city_name": city_to_query})
            location = get_last_location()
            return {
                "response": (
                    f"**[Notice: Running in Instant Response Mode]**\n\n"
                    f"{weather_res}\n\n"
                    f"*Tip: Configure GROQ_API_KEY in `.env` to unlock full autonomous multi-step reasoning.*"
                ),
                "tools_used": ["get_live_weather"],
                "status": "fallback",
                "location": location
            }
        elif any(k in lower_q for k in ["flood", "cyclone", "hurricane", "earthquake", "disaster", "safety", "emergency"]):
            disaster_res = search_disaster_guidelines.invoke({"query": user_query})
            return {
                "response": (
                    f"**[Official Disaster Safety Guidelines]**\n\n"
                    f"{disaster_res}\n\n"
                    f"*Tip: Configure GROQ_API_KEY in `.env` to unlock full autonomous multi-step reasoning.*"
                ),
                "tools_used": ["search_disaster_guidelines"],
                "status": "fallback",
                "location": None
            }
        else:
            return {
                "response": (
                    "Welcome to **WeatherGPT**!\n\n"
                    "Ask me about real-time weather anywhere (e.g. *'What is the weather in Pune?'*) "
                    "or disaster preparedness protocols (e.g. *'Flood emergency evacuation guidelines'*).\n\n"
                    "The interactive Leaflet map will automatically pan and fly to any city you inquire about!"
                ),
                "tools_used": [],
                "status": "intro",
                "location": None
            }

    try:
        result = agent_executor.invoke({
            "input": user_query,
            "chat_history": formatted_history
        })

        # Extract names of tools used
        tools_used = []
        if "intermediate_steps" in result:
            for action, _ in result["intermediate_steps"]:
                if hasattr(action, "tool") and action.tool not in tools_used:
                    tools_used.append(action.tool)

        location = get_last_location()

        # If tool didn't set location but city is mentioned, populate fallback coords
        if not location:
            detected_city = detect_city_in_text(user_query)
            if detected_city:
                coords = FALLBACK_COORDINATES[detected_city]
                location = {
                    "city": detected_city.title(),
                    "country": coords["country"],
                    "lat": coords["lat"],
                    "lon": coords["lon"],
                    "temp": None,
                    "condition": "Reported",
                    "warnings": []
                }

        return {
            "response": result.get("output", "No response generated."),
            "tools_used": tools_used,
            "status": "success",
            "location": location
        }
    except Exception as e:
        return {
            "response": f"An error occurred while processing your request: {str(e)}",
            "tools_used": [],
            "status": "error",
            "location": None
        }
