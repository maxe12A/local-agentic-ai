"""
tools.py
--------
Tool definitions and registry for the local Agentic AI.

Works with:
    - LangChain
    - Ollama
    - Qwen3:4b

Available tools:
    1. calculate
    2. get_current_time
    3. read_file
    4. write_file
    5. get_weather
    6. web_search
"""

import ast
import json
import math
import os
import urllib.parse
import urllib.request

from datetime import datetime, timezone
from typing import Any, Callable, Dict, List

from langchain_core.tools import StructuredTool


# ============================================================
# TOOL REGISTRY
# ============================================================

class ToolRegistry:
    """
    Central registry for all Agentic AI tools.
    """

    def __init__(self):
        self._tools: Dict[str, Callable] = {}
        self._schemas: List[Dict[str, Any]] = []

    # --------------------------------------------------------
    # REGISTER TOOL
    # --------------------------------------------------------

    def register(
        self,
        name: str,
        description: str,
        parameters: Dict[str, Any],
    ):
        """
        Decorator used to register a Python function as a tool.
        """

        def decorator(func: Callable):

            self._tools[name] = func

            schema = {
                "type": "function",
                "function": {
                    "name": name,
                    "description": description,
                    "parameters": parameters,
                },
            }

            self._schemas.append(schema)

            return func

        return decorator

    # --------------------------------------------------------
    # GET SCHEMAS
    # --------------------------------------------------------

    def get_schemas(self) -> List[Dict[str, Any]]:
        """
        Return the tools in JSON schema format.
        """

        return self._schemas

    # --------------------------------------------------------
    # GET LANGCHAIN TOOLS
    # --------------------------------------------------------

    def get_tools(self) -> List[StructuredTool]:
        """
        Convert all registered Python functions into
        LangChain StructuredTool objects.

        This is the method that allows Qwen3 through
        ChatOllama to discover and call our tools.
        """

        tools = []

        for schema in self._schemas:

            function_info = schema["function"]

            name = function_info["name"]

            description = function_info["description"]

            function = self._tools[name]

            tool = StructuredTool.from_function(
                func=function,
                name=name,
                description=description,
            )

            tools.append(tool)

        return tools

    # --------------------------------------------------------
    # EXECUTE TOOL
    # --------------------------------------------------------

    def execute(
        self,
        tool_name: str,
        arguments: Dict[str, Any],
    ) -> str:
        """
        Execute a registered tool.
        """

        if tool_name not in self._tools:

            return (
                f"Error: Tool '{tool_name}' "
                f"is not registered."
            )

        try:

            function = self._tools[tool_name]

            result = function(**arguments)

            if isinstance(result, (dict, list)):

                return json.dumps(
                    result,
                    indent=2,
                )

            return str(result)

        except Exception as error:

            return (
                f"Error executing tool "
                f"'{tool_name}': {error}"
            )


# Create global registry
registry = ToolRegistry()


# ============================================================
# TOOL 1 — CALCULATOR
# ============================================================

@registry.register(
    name="calculate",
    description=(
        "Calculate mathematical expressions safely. "
        "Supports addition, subtraction, multiplication, "
        "division, powers, square roots, trigonometry, "
        "logarithms, min, max, abs and rounding."
    ),
    parameters={
        "type": "object",
        "properties": {
            "expression": {
                "type": "string",
                "description": (
                    "Mathematical expression such as "
                    "'332 * 23', 'sqrt(144)', "
                    "or '2 ** 10'."
                ),
            }
        },
        "required": ["expression"],
    },
)
def calculate(expression: str) -> str:
    """
    Safely evaluate a mathematical expression.
    """

    allowed_functions = {
        "abs": abs,
        "round": round,
        "min": min,
        "max": max,
        "sqrt": math.sqrt,
        "sin": math.sin,
        "cos": math.cos,
        "tan": math.tan,
        "log": math.log,
        "log10": math.log10,
        "exp": math.exp,
        "pow": pow,
        "floor": math.floor,
        "ceil": math.ceil,
    }

    allowed_constants = {
        "pi": math.pi,
        "e": math.e,
    }

    allowed_names = {
        **allowed_functions,
        **allowed_constants,
    }

    expression = expression.strip()

    if not expression:

        return "Error: Empty expression."

    try:

        tree = ast.parse(
            expression,
            mode="eval",
        )

        allowed_nodes = (
            ast.Expression,
            ast.Constant,
            ast.Name,
            ast.Load,
            ast.BinOp,
            ast.UnaryOp,
            ast.Add,
            ast.Sub,
            ast.Mult,
            ast.Div,
            ast.FloorDiv,
            ast.Mod,
            ast.Pow,
            ast.USub,
            ast.UAdd,
            ast.Call,
        )

        for node in ast.walk(tree):

            if not isinstance(
                node,
                allowed_nodes,
            ):

                raise ValueError(
                    f"Unsupported expression element: "
                    f"{type(node).__name__}"
                )

            if isinstance(node, ast.Name):

                if node.id not in allowed_names:

                    raise ValueError(
                        f"Name '{node.id}' "
                        f"is not allowed."
                    )

            if isinstance(node, ast.Call):

                if not isinstance(
                    node.func,
                    ast.Name,
                ):

                    raise ValueError(
                        "Only approved functions "
                        "are allowed."
                    )

                if node.func.id not in allowed_functions:

                    raise ValueError(
                        f"Function '{node.func.id}' "
                        f"is not allowed."
                    )

        result = eval(
            compile(
                tree,
                "<calculator>",
                "eval",
            ),
            {
                "__builtins__": {},
            },
            allowed_names,
        )

        return str(result)

    except Exception as error:

        return f"Calculation error: {error}"


# ============================================================
# TOOL 2 — CURRENT TIME
# ============================================================

@registry.register(
    name="get_current_time",
    description=(
        "Get the current date and time. "
        "Can return UTC or local computer time."
    ),
    parameters={
        "type": "object",
        "properties": {
            "timezone_str": {
                "type": "string",
                "description": (
                    "Use 'UTC' for UTC time or "
                    "'local' for local system time."
                ),
                "default": "UTC",
            }
        },
        "required": [],
    },
)
def get_current_time(
    timezone_str: str = "UTC",
) -> str:
    """
    Return current date and time.
    """

    if timezone_str.lower() == "utc":

        now = datetime.now(
            timezone.utc
        )

        return now.strftime(
            "%Y-%m-%d %H:%M:%S UTC"
        )

    now = datetime.now()

    return now.strftime(
        "%Y-%m-%d %H:%M:%S (Local)"
    )


# ============================================================
# TOOL 3 — READ FILE
# ============================================================

@registry.register(
    name="read_file",
    description=(
        "Read the contents of a local text file."
    ),
    parameters={
        "type": "object",
        "properties": {
            "file_path": {
                "type": "string",
                "description": (
                    "Path to the local file."
                ),
            }
        },
        "required": ["file_path"],
    },
)
def read_file(
    file_path: str,
) -> str:
    """
    Read a local file.
    """

    if not os.path.exists(file_path):

        return (
            f"Error: File '{file_path}' "
            f"does not exist."
        )

    if not os.path.isfile(file_path):

        return (
            f"Error: '{file_path}' "
            f"is not a file."
        )

    try:

        with open(
            file_path,
            "r",
            encoding="utf-8",
        ) as file:

            return file.read()

    except Exception as error:

        return (
            f"Error reading file: {error}"
        )


# ============================================================
# TOOL 4 — WRITE FILE
# ============================================================

@registry.register(
    name="write_file",
    description=(
        "Write text content to a local file. "
        "Creates directories automatically."
    ),
    parameters={
        "type": "object",
        "properties": {
            "file_path": {
                "type": "string",
                "description": (
                    "Path where the file should be written."
                ),
            },
            "content": {
                "type": "string",
                "description": (
                    "Content to write to the file."
                ),
            },
        },
        "required": [
            "file_path",
            "content",
        ],
    },
)
def write_file(
    file_path: str,
    content: str,
) -> str:
    """
    Write content to a local file.
    """

    try:

        parent_dir = os.path.dirname(
            file_path
        )

        if parent_dir:

            os.makedirs(
                parent_dir,
                exist_ok=True,
            )

        with open(
            file_path,
            "w",
            encoding="utf-8",
        ) as file:

            file.write(content)

        return (
            f"Successfully wrote "
            f"{len(content)} characters to "
            f"'{file_path}'."
        )

    except Exception as error:

        return (
            f"Error writing file: {error}"
        )


# ============================================================
# TOOL 5 — WEATHER
# ============================================================

@registry.register(
    name="get_weather",
    description=(
        "Get current weather information "
        "for a city using an online weather service."
    ),
    parameters={
        "type": "object",
        "properties": {
            "city": {
                "type": "string",
                "description": (
                    "City name such as Bengaluru, "
                    "London, Tokyo."
                ),
            }
        },
        "required": ["city"],
    },
)
def get_weather(
    city: str,
) -> str:
    """
    Retrieve current weather from wttr.in.
    """

    try:

        encoded_city = urllib.parse.quote(
            city
        )

        url = (
            f"https://wttr.in/"
            f"{encoded_city}"
            f"?format=j1"
        )

        request = urllib.request.Request(
            url,
            headers={
                "User-Agent": "agentic-ai/1.0"
            },
        )

        with urllib.request.urlopen(
            request,
            timeout=5,
        ) as response:

            data = json.loads(
                response.read().decode()
            )

        current = data[
            "current_condition"
        ][0]

        temperature = current["temp_C"]

        feels_like = current["FeelsLikeC"]

        description = current[
            "weatherDesc"
        ][0]["value"]

        humidity = current["humidity"]

        wind = current["windspeedKmph"]

        return (
            f"Weather in {city}: "
            f"{description}, "
            f"Temperature: {temperature}°C, "
            f"Feels like: {feels_like}°C, "
            f"Humidity: {humidity}%, "
            f"Wind: {wind} km/h."
        )

    except Exception as error:

        return (
            f"Unable to retrieve weather "
            f"for {city}: {error}"
        )


# ============================================================
# TOOL 6 — WEB SEARCH
# ============================================================

@registry.register(
    name="web_search",
    description=(
        "Search the web for information "
        "using the DuckDuckGo Instant Answer API."
    ),
    parameters={
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": (
                    "Search query."
                ),
            }
        },
        "required": ["query"],
    },
)
def web_search(
    query: str,
) -> str:
    """
    Search DuckDuckGo.
    """

    try:

        encoded_query = urllib.parse.quote(
            query
        )

        url = (
            "https://api.duckduckgo.com/"
            f"?q={encoded_query}"
            "&format=json"
            "&no_html=1"
            "&skip_disambig=1"
        )

        request = urllib.request.Request(
            url,
            headers={
                "User-Agent": "agentic-ai/1.0"
            },
        )

        with urllib.request.urlopen(
            request,
            timeout=8,
        ) as response:

            data = json.loads(
                response.read().decode()
            )

        abstract = data.get(
            "AbstractText",
            "",
        )

        if abstract:

            source = data.get(
                "AbstractSource",
                "DuckDuckGo",
            )

            return (
                f"Source: {source}\n"
                f"Result: {abstract}"
            )

        related_topics = data.get(
            "RelatedTopics",
            [],
        )

        results = []

        for item in related_topics[:5]:

            if "Text" in item:

                results.append(
                    item["Text"]
                )

        if results:

            return (
                "Search results:\n"
                + "\n".join(
                    f"- {result}"
                    for result in results
                )
            )

        return (
            f"No useful result found "
            f"for '{query}'."
        )

    except Exception as error:

        return (
            f"Web search failed: {error}"
        )


# ============================================================
# TEST TOOLS
# ============================================================

if __name__ == "__main__":

    print()
    print("=" * 60)
    print("REGISTERED AGENT TOOLS")
    print("=" * 60)

    tools = registry.get_tools()

    for tool in tools:

        print(
            f"✓ {tool.name}"
        )

    print()
    print(
        f"Total tools: {len(tools)}"
    )

    print()
    print("=" * 60)
    print("CALCULATOR TEST")
    print("=" * 60)

    result = registry.execute(
        "calculate",
        {
            "expression": "332 * 23"
        },
    )

    print(
        f"332 × 23 = {result}"
    )

    print()
    print("=" * 60)
    print("LANGCHAIN TOOL TEST")
    print("=" * 60)

    for tool in tools:

        print(
            f"{tool.name} → "
            f"{type(tool).__name__}"
        )

    print()
    print("✓ tools.py is working correctly.")