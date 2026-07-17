"""Source-registry CLI: list / add / enable / disable / show.

Usage:
    python -m ingestion.manage list [--active]
    python -m ingestion.manage show <source_id>
    python -m ingestion.manage enable <source_id>
    python -m ingestion.manage disable <source_id>
    python -m ingestion.manage add --name NAME --category CATEGORY [--crawler-key KEY] ...
"""

from __future__ import annotations

import argparse
import json

from common.db import session_scope
from warehouse.enums import SourceCategory
from warehouse.repositories import SourcesRepo
from warehouse.schemas import SourceCreate, SourceRead


def _print(source) -> None:  # noqa: ANN001
    print(json.dumps(SourceRead.model_validate(source).model_dump(), indent=2, default=str))


def cmd_list(args: argparse.Namespace) -> None:
    with session_scope() as session:
        for s in SourcesRepo(session).list(active_only=args.active):
            print(f"{s.id}  [{'x' if s.is_active else ' '}]  {s.category:12}  {s.source_name}")


def cmd_show(args: argparse.Namespace) -> None:
    with session_scope() as session:
        s = SourcesRepo(session).get(args.source_id)
        if s is None:
            raise SystemExit(f"source not found: {args.source_id}")
        _print(s)


def cmd_enable(args: argparse.Namespace) -> None:
    with session_scope() as session:
        s = SourcesRepo(session).set_active(args.source_id, True)
        if s is None:
            raise SystemExit("source not found")
        print(f"enabled {s.source_name}")


def cmd_disable(args: argparse.Namespace) -> None:
    with session_scope() as session:
        s = SourcesRepo(session).set_active(args.source_id, False)
        if s is None:
            raise SystemExit("source not found")
        print(f"disabled {s.source_name}")


def cmd_add(args: argparse.Namespace) -> None:
    data = SourceCreate(
        source_name=args.name,
        category=SourceCategory(args.category),
        access_method=args.access_method,
        refresh_cadence=args.refresh_cadence,
        legal_basis=args.legal_basis,
        base_url=args.base_url,
        crawler_key=args.crawler_key,
        config=json.loads(args.config) if args.config else {},
    )
    with session_scope() as session:
        s, created = SourcesRepo(session).upsert_by_name(data)
        print(f"{'created' if created else 'updated'} {s.source_name} ({s.id})")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="ingestion.manage")
    sub = parser.add_subparsers(dest="command", required=True)

    p_list = sub.add_parser("list")
    p_list.add_argument("--active", action="store_true")
    p_list.set_defaults(func=cmd_list)

    p_show = sub.add_parser("show")
    p_show.add_argument("source_id")
    p_show.set_defaults(func=cmd_show)

    p_enable = sub.add_parser("enable")
    p_enable.add_argument("source_id")
    p_enable.set_defaults(func=cmd_enable)

    p_disable = sub.add_parser("disable")
    p_disable.add_argument("source_id")
    p_disable.set_defaults(func=cmd_disable)

    p_add = sub.add_parser("add")
    p_add.add_argument("--name", required=True)
    p_add.add_argument("--category", required=True, choices=[c.value for c in SourceCategory])
    p_add.add_argument("--access-method", dest="access_method")
    p_add.add_argument("--refresh-cadence", dest="refresh_cadence")
    p_add.add_argument("--legal-basis", dest="legal_basis")
    p_add.add_argument("--base-url", dest="base_url")
    p_add.add_argument("--crawler-key", dest="crawler_key")
    p_add.add_argument("--config", help="JSON string")
    p_add.set_defaults(func=cmd_add)

    return parser


def main() -> None:
    args = build_parser().parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
