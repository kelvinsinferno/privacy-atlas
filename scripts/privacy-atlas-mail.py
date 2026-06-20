#!/usr/bin/env python
"""Privacy Atlas partnerships mailbox helper.

Reads mailbox credentials from the active Hermes profile .env (or process env) and
performs basic IMAP/SMTP operations without printing secrets.

Usage:
  python scripts/privacy-atlas-mail.py check
  python scripts/privacy-atlas-mail.py send-test partnerships@privacyatlas.xyz
  python scripts/privacy-atlas-mail.py inbox --limit 10
  python scripts/privacy-atlas-mail.py send --to person@example.com --subject "Subject" --body-file body.txt
"""
from __future__ import annotations

import argparse
import imaplib
import os
import smtplib
import ssl
from datetime import datetime, timezone
from email.header import decode_header
from email.message import EmailMessage
from email.parser import BytesParser
from email.policy import default
from pathlib import Path

ENV_PATH = Path.home() / "AppData" / "Local" / "hermes" / "profiles" / "privacy-atlas" / ".env"


def load_env() -> dict[str, str]:
    vals = dict(os.environ)
    if ENV_PATH.exists():
        for line in ENV_PATH.read_text(errors="replace").splitlines():
            s = line.strip().lstrip("\ufeff")
            if s and not s.startswith("#") and "=" in s:
                k, v = s.split("=", 1)
                vals[k.strip()] = v.strip().strip('"').strip("'")
    return vals


def cfg() -> dict[str, str]:
    vals = load_env()
    required = [
        "PRIVACY_ATLAS_EMAIL",
        "PRIVACY_ATLAS_EMAIL_DISPLAY_NAME",
        "PRIVACY_ATLAS_IMAP_HOST",
        "PRIVACY_ATLAS_IMAP_PORT",
        "PRIVACY_ATLAS_SMTP_HOST",
        "PRIVACY_ATLAS_SMTP_PORT",
        "PRIVACY_ATLAS_EMAIL_PASSWORD",
    ]
    missing = [k for k in required if not vals.get(k)]
    if missing:
        raise SystemExit(f"Missing env vars: {', '.join(missing)}")
    return vals


def decode(value: str | None) -> str:
    if not value:
        return ""
    parts = decode_header(value)
    out = []
    for text, enc in parts:
        if isinstance(text, bytes):
            out.append(text.decode(enc or "utf-8", errors="replace"))
        else:
            out.append(text)
    return "".join(out)


def imap_conn(vals: dict[str, str]) -> imaplib.IMAP4_SSL:
    im = imaplib.IMAP4_SSL(vals["PRIVACY_ATLAS_IMAP_HOST"], int(vals["PRIVACY_ATLAS_IMAP_PORT"]), timeout=30)
    im.login(vals["PRIVACY_ATLAS_EMAIL"], vals["PRIVACY_ATLAS_EMAIL_PASSWORD"])
    return im


def make_message(vals: dict[str, str], to: str, subject: str, body: str, reply_to: str | None = None) -> EmailMessage:
    msg = EmailMessage()
    sender = vals["PRIVACY_ATLAS_EMAIL"]
    display = vals.get("PRIVACY_ATLAS_EMAIL_DISPLAY_NAME", "Privacy Atlas Partnerships")
    msg["From"] = f"{display} <{sender}>"
    msg["To"] = to
    msg["Subject"] = subject
    msg["Date"] = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S %z")
    if reply_to:
        msg["Reply-To"] = reply_to
    msg.set_content(body)
    return msg


def send_message(vals: dict[str, str], msg: EmailMessage) -> None:
    context = ssl.create_default_context()
    with smtplib.SMTP(vals["PRIVACY_ATLAS_SMTP_HOST"], int(vals["PRIVACY_ATLAS_SMTP_PORT"]), timeout=30) as smtp:
        smtp.ehlo()
        smtp.starttls(context=context)
        smtp.ehlo()
        smtp.login(vals["PRIVACY_ATLAS_EMAIL"], vals["PRIVACY_ATLAS_EMAIL_PASSWORD"])
        refused = smtp.send_message(msg)
        if refused:
            raise SystemExit(f"SMTP refused recipients: {sorted(refused)}")


def cmd_check(_: argparse.Namespace) -> None:
    vals = cfg()
    with imap_conn(vals) as im:
        typ, boxes = im.list()
        typ2, data = im.select("INBOX", readonly=True)
        print(f"imap_login=ok mailboxes={len(boxes or [])} inbox_messages={(data or [b'0'])[0].decode(errors='replace')}")
        im.logout()
    msg = make_message(vals, vals["PRIVACY_ATLAS_EMAIL"], "Privacy Atlas mailbox check", "Automated mailbox check from Privacy Atlas.\n")
    send_message(vals, msg)
    print("smtp_send=ok")


def cmd_send_test(args: argparse.Namespace) -> None:
    vals = cfg()
    to = args.to or vals["PRIVACY_ATLAS_EMAIL"]
    msg = make_message(vals, to, "Privacy Atlas mailbox test", "Automated test from Privacy Atlas partnerships mailbox.\n")
    send_message(vals, msg)
    print(f"sent_test_to={to}")


def cmd_inbox(args: argparse.Namespace) -> None:
    vals = cfg()
    with imap_conn(vals) as im:
        im.select("INBOX", readonly=True)
        typ, data = im.search(None, "ALL")
        ids = (data[0].split() if data and data[0] else [])[-args.limit:]
        for msg_id in reversed(ids):
            typ, msgdata = im.fetch(msg_id, "(BODY.PEEK[HEADER])")
            raw = b"".join(part[1] for part in msgdata if isinstance(part, tuple))
            msg = BytesParser(policy=default).parsebytes(raw)
            print(f"id={msg_id.decode()} date={decode(msg.get('Date'))} from={decode(msg.get('From'))} subject={decode(msg.get('Subject'))}")
        im.logout()


def cmd_send(args: argparse.Namespace) -> None:
    vals = cfg()
    body = Path(args.body_file).read_text(encoding="utf-8")
    msg = make_message(vals, args.to, args.subject, body, reply_to=args.reply_to)
    send_message(vals, msg)
    print(f"sent_to={args.to}")


def main() -> None:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("check"); p.set_defaults(func=cmd_check)
    p = sub.add_parser("send-test"); p.add_argument("to", nargs="?"); p.set_defaults(func=cmd_send_test)
    p = sub.add_parser("inbox"); p.add_argument("--limit", type=int, default=10); p.set_defaults(func=cmd_inbox)
    p = sub.add_parser("send"); p.add_argument("--to", required=True); p.add_argument("--subject", required=True); p.add_argument("--body-file", required=True); p.add_argument("--reply-to"); p.set_defaults(func=cmd_send)
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
