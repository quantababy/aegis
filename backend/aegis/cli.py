"""
AEGIS CLI — command-line interface for red-team scanning and defense.

Provides three commands:
  aegis scan   — run end-to-end red-team scan against a target
  aegis guard  — evaluate a single payload through the defense guard
  aegis report — display results from the most recent scan

Uses Click for argument parsing and Rich for terminal output.
"""

import json
import sys
import time

try:
    import click
    from rich.console import Console
    from rich.table import Table
    from rich.panel import Panel
    from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn
    HAS_RICH = True
except ImportError:
    HAS_RICH = False

from aegis.core.models import ScanConfig, AttackType
from aegis.redteam.scanner import Scanner
from aegis.defense.guard import DefenseGuard
from aegis.blockchain.ledger import MockLedger

if not HAS_RICH:
    # Fallback for environments without rich/click
    print("AEGIS CLI requires 'click' and 'rich'. Install with: pip install click rich")
    sys.exit(1)

console = Console()


@click.group()
def cli():
    """🛡️ AEGIS — Autonomous AI Red-Teaming & Vulnerability Intelligence Shield"""
    pass


@cli.command()
@click.option("--target", default="mock", help="Target model identifier")
@click.option("--attacks", default=20, help="Number of attack payloads to test")
@click.option("--depth", default=3, help="Maximum mutation depth (generations)")
@click.option("--json-output", is_flag=True, help="Output results as JSON")
def scan(target, attacks, depth, json_output):
    """Run an end-to-end red-team scan against a target model."""
    config = ScanConfig(
        target=target,
        num_attacks=attacks,
        mutation_depth=depth,
    )
    scanner = Scanner(config=config)
    ledger = MockLedger()

    if not json_output:
        console.print(Panel.fit(
            f"[bold red]🛡️ AEGIS Red-Team Scan[/bold red]\n"
            f"Target: [cyan]{target}[/cyan]  |  Attacks: [yellow]{attacks}[/yellow]  |  Depth: [green]{depth}[/green]",
            border_style="red",
        ))

    # Run scan with progress bar
    if not json_output:
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
            console=console,
        ) as progress:
            task = progress.add_task("Scanning...", total=100)
            progress.update(task, advance=30)
            result = scanner.run()
            progress.update(task, advance=70)
    else:
        result = scanner.run()

    # Record on ledger
    for vuln in result.vulnerabilities:
        ledger.record_vulnerability(vuln)

    if json_output:
        output = {
            "scan_id": result.scan_id,
            "status": result.status,
            "total_tested": result.total_payloads_tested,
            "total_vulns": result.total_vulns_found,
            "vulnerabilities": [
                {
                    "attack_type": v.attack.attack_type.value,
                    "severity": v.severity.cvss_score,
                    "risk_level": v.severity.risk_level.value,
                    "payload": v.attack.payload[:100],
                    "evidence_hash": v.evidence_hash,
                }
                for v in result.vulnerabilities
            ],
        }
        click.echo(json.dumps(output, indent=2))
        return

    # Display results table
    console.print()
    table = Table(title="Discovered Vulnerabilities", border_style="dim")
    table.add_column("Risk", style="bold", width=10)
    table.add_column("Type", width=22)
    table.add_column("CVSS", justify="right", width=6)
    table.add_column("Payload", max_width=50)
    table.add_column("Hash", width=18)

    risk_colors = {"CRITICAL": "red", "HIGH": "yellow", "MEDIUM": "cyan", "LOW": "green"}
    for v in result.vulnerabilities:
        risk = v.severity.risk_level.value
        color = risk_colors.get(risk, "white")
        table.add_row(
            f"[{color}]{risk}[/{color}]",
            v.attack.attack_type.value.replace("_", " "),
            f"[{color}]{v.severity.cvss_score:.1f}[/{color}]",
            v.attack.payload[:50],
            v.evidence_hash[:16] + "...",
        )

    console.print(table)

    # Summary
    stats = scanner.get_stats()
    console.print(Panel.fit(
        f"[bold]Scan Complete[/bold]\n"
        f"Tested: [cyan]{result.total_payloads_tested}[/cyan]  |  "
        f"Vulns: [red]{result.total_vulns_found}[/red]  |  "
        f"Graph Nodes: [green]{stats['graph']['nodes']}[/green]  |  "
        f"Bloom Fill: [yellow]{stats['bloom']['utilization']:.1%}[/yellow]  |  "
        f"Ledger Txs: [magenta]{ledger.stats()['total_transactions']}[/magenta]",
        border_style="green",
    ))


@cli.command()
@click.argument("payload")
def guard(payload):
    """Evaluate a single payload through the defense guard."""
    guard_instance = DefenseGuard()
    result = guard_instance.evaluate(payload)

    action = result["action"]
    color = {"BLOCK": "red", "FLAG": "yellow", "PASS": "green"}.get(action, "white")

    console.print(Panel.fit(
        f"[bold {color}]{action}[/bold {color}]\n"
        f"Type: [cyan]{result['attack_type']}[/cyan]  |  "
        f"Confidence: [yellow]{result['confidence']:.0%}[/yellow]  |  "
        f"CVSS: [{color}]{result['cvss_score']:.1f}[/{color}]  |  "
        f"Latency: [dim]{result['latency_ms']}ms[/dim]",
        title="🛡️ Defense Guard",
        border_style=color,
    ))


@cli.command()
@click.option("--format", "fmt", default="table", type=click.Choice(["table", "json"]))
def report(fmt):
    """Display a summary report (runs a quick scan if no prior data)."""
    config = ScanConfig(num_attacks=15)
    scanner = Scanner(config=config)
    result = scanner.run()

    if fmt == "json":
        click.echo(json.dumps({
            "total_tested": result.total_payloads_tested,
            "total_vulns": result.total_vulns_found,
            "stats": scanner.get_stats(),
        }, indent=2))
    else:
        console.print(Panel.fit(
            f"[bold]AEGIS Report[/bold]\n"
            f"Payloads Tested: [cyan]{result.total_payloads_tested}[/cyan]\n"
            f"Vulnerabilities: [red]{result.total_vulns_found}[/red]\n"
            f"Graph Nodes: [green]{scanner.get_stats()['graph']['nodes']}[/green]",
            border_style="blue",
        ))


if __name__ == "__main__":
    cli()
