"""
main.py - Agentic AI CLI

Local Agentic AI using:
- LangChain
- LangGraph-ready architecture
- Ollama
- Qwen3:4b
- Local tool calling

No OpenAI API key required.
"""

import os
import sys
from typing import Any

from langchain_ollama import ChatOllama

# Ensure local imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from agent import Agent
from tools import registry


# ============================================================
# OLLAMA CONFIGURATION
# ============================================================

MODEL_NAME = "qwen3:4b"

llm = ChatOllama(
    model=MODEL_NAME,
    temperature=0,
)


# ============================================================
# RICH TERMINAL UI
# ============================================================

try:
    from rich.console import Console
    from rich.panel import Panel
    from rich.markdown import Markdown
    from rich.table import Table

    USE_RICH = True
    console = Console()

except ImportError:
    USE_RICH = False
    console = None


# ============================================================
# BANNER
# ============================================================

def print_banner():
    """Display startup information."""

    if USE_RICH:

        banner = (
            "[bold cyan]🤖 LOCAL AGENTIC AI[/bold cyan]\n\n"
            f"[bold green]LLM:[/bold green] Ollama / {MODEL_NAME}\n"
            "[bold green]Framework:[/bold green] LangChain\n"
            "[bold green]Architecture:[/bold green] Tool-Calling Agent\n\n"
            "[dim]The model runs locally on your Mac.[/dim]\n\n"
            "[yellow]Commands:[/yellow]\n"
            "  /tools  → Show available tools\n"
            "  /clear  → Clear conversation\n"
            "  /model  → Show current model\n"
            "  /exit   → Exit"
        )

        console.print(
            Panel(
                banner,
                title="Agentic AI",
                border_style="cyan"
            )
        )

    else:

        print("=" * 65)
        print("🤖 LOCAL AGENTIC AI")
        print("=" * 65)
        print(f"LLM: Ollama / {MODEL_NAME}")
        print("Framework: LangChain")
        print("Architecture: Tool-Calling Agent")
        print()
        print("Commands:")
        print("  /tools  - Show tools")
        print("  /clear  - Clear conversation")
        print("  /model  - Show model")
        print("  /exit   - Exit")
        print("=" * 65)


# ============================================================
# SHOW TOOLS
# ============================================================

def print_tools():

    schemas = registry.get_schemas()

    if USE_RICH:

        table = Table(
            title="🛠️ Available Agent Tools",
            show_header=True
        )

        table.add_column("Tool", style="cyan")
        table.add_column("Description")
        table.add_column("Parameters", style="green")

        for schema in schemas:

            fn = schema["function"]

            params = list(
                fn["parameters"]
                .get("properties", {})
                .keys()
            )

            param_string = ", ".join(params) if params else "None"

            table.add_row(
                fn["name"],
                fn["description"],
                param_string
            )

        console.print(table)

    else:

        print("\n🛠️ Available Tools")

        for schema in schemas:

            fn = schema["function"]

            print(
                f"- {fn['name']}: "
                f"{fn['description']}"
            )

        print()


# ============================================================
# AGENT EVENTS
# ============================================================

def agent_step_callback(
    event_type: str,
    data: Any
):

    if event_type == "tool_start":

        name = data.get("name")
        args = data.get("args")

        if USE_RICH:

            console.print(
                f"\n[bold yellow]⚙️ TOOL CALL[/bold yellow]\n"
                f"[cyan]{name}[/cyan]\n"
                f"[dim]Arguments: {args}[/dim]"
            )

        else:

            print(
                f"\n⚙️ Tool: {name}"
            )

            print(
                f"Arguments: {args}"
            )

    elif event_type == "tool_result":

        name = data.get("name")
        result = str(data.get("result", ""))

        preview = (
            result[:500]
            + ("..." if len(result) > 500 else "")
        )

        if USE_RICH:

            console.print(
                f"[bold green]↳ TOOL RESULT "
                f"[{name}][/bold green]"
            )

            console.print(preview)

        else:

            print(
                f"↳ Tool Result [{name}]:"
            )

            print(preview)

    elif event_type == "error":

        if USE_RICH:

            console.print(
                f"[bold red]❌ ERROR:[/bold red] "
                f"{data}"
            )

        else:

            print(f"❌ ERROR: {data}")


# ============================================================
# MAIN
# ============================================================

def main():

    print_banner()

    # --------------------------------------------------------
    # Create Agent
    # --------------------------------------------------------

    try:

        # IMPORTANT:
        # Your Agent class should accept the LLM.
        agent = Agent(llm=llm)

    except TypeError:

        print(
            "\n⚠️ Your Agent class currently does not "
            "accept an 'llm' parameter."
        )

        print(
            "We need to modify agent.py next so that "
            "it uses ChatOllama."
        )

        return

    # --------------------------------------------------------
    # Command-line mode
    # --------------------------------------------------------

    if len(sys.argv) > 1:

        prompt = " ".join(sys.argv[1:])

        print(
            f"\n👤 User:\n{prompt}\n"
        )

        response = agent.run(
            prompt,
            step_callback=agent_step_callback
        )

        print("\n🤖 Agent:")

        if USE_RICH:

            console.print(
                Markdown(response)
            )

        else:

            print(response)

        return

    # --------------------------------------------------------
    # Interactive mode
    # --------------------------------------------------------

    while True:

        try:

            user_input = input(
                "\n👤 You > "
            ).strip()

            if not user_input:
                continue

            # EXIT
            if user_input.lower() in (
                "/exit",
                "exit",
                "quit",
                ":q"
            ):

                print(
                    "\n👋 Goodbye!"
                )

                break

            # CLEAR MEMORY
            if user_input.lower() in (
                "/clear",
                "clear",
                "/reset"
            ):

                agent.reset()

                print(
                    "🧹 Conversation memory cleared."
                )

                continue

            # SHOW TOOLS
            if user_input.lower() in (
                "/tools",
                "tools",
                "/help"
            ):

                print_tools()

                continue

            # SHOW MODEL
            if user_input.lower() == "/model":

                print(
                    f"\n🧠 Model: {MODEL_NAME}"
                )

                print(
                    "⚡ Runtime: Ollama"
                )

                print(
                    "🔒 Inference: Local"
                )

                continue

            # ------------------------------------------------
            # RUN AGENT
            # ------------------------------------------------

            print(
                "\n🤔 Agent is thinking..."
            )

            response = agent.run(
                user_input,
                step_callback=agent_step_callback
            )

            print(
                "\n🤖 Agent Response:"
            )

            if USE_RICH:

                console.print(
                    Markdown(response)
                )

            else:

                print(response)

        except KeyboardInterrupt:

            print(
                "\n\n👋 Session interrupted."
            )

            break

        except Exception as e:

            print(
                f"\n❌ Unexpected error: {e}"
            )


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    main()