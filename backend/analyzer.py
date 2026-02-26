import re
from collections import defaultdict
from typing import Dict, List, Optional

PROMO_KEYWORDS = [
    "unsubscribe", "promoção", "oferta", "desconto", "sale", "deal",
    "newsletter", "no-reply", "noreply", "marketing", "notification",
    "alert", "update", "offer", "free", "win", "winner", "click here",
    "act now", "limited time", "exclusive", "% off",
]

PROMO_DOMAINS = [
    "mailchimp", "sendgrid", "klaviyo", "hubspot", "constantcontact",
    "campaign-monitor", "mailerlite", "brevo", "sendinblue",
]


def extract_sender_domain(email: str) -> str:
    match = re.search(r"@([\w.-]+)", email)
    return match.group(1).lower() if match else email.lower()


def extract_sender_email(header: str) -> str:
    match = re.search(r"<(.+?)>", header)
    if match:
        return match.group(1).lower()
    return header.strip().lower()


def extract_sender_name(header: str) -> str:
    match = re.search(r"^(.+?)\s*<", header)
    if match:
        return match.group(1).strip().strip('"')
    return header.strip()


def is_promotional(subject: str, sender: str, snippet: str) -> bool:
    text = f"{subject} {sender} {snippet}".lower()
    for kw in PROMO_KEYWORDS:
        if kw in text:
            return True
    domain = extract_sender_domain(sender)
    for pd in PROMO_DOMAINS:
        if pd in domain:
            return True
    return False


def calculate_score(count: int, promo_ratio: float, never_replied: bool) -> int:
    score = 0
    if count >= 50:
        score += 40
    elif count >= 20:
        score += 25
    elif count >= 10:
        score += 15
    elif count >= 5:
        score += 8

    score += int(promo_ratio * 40)

    if never_replied:
        score += 20

    return min(score, 100)


def calculate_health_score(senders_data: List[Dict]) -> int:
    if not senders_data:
        return 100

    total = sum(s["count"] for s in senders_data)
    if total == 0:
        return 100

    toxic_emails = sum(s["count"] for s in senders_data if s["score"] >= 70)
    ratio = toxic_emails / total

    health = int((1 - ratio) * 100)
    return max(0, min(100, health))


# Fix 1: replied_to agora é passado e usado corretamente
def aggregate_senders(
    messages: List[Dict],
    replied_to: Optional[set] = None,
) -> List[Dict]:
    sender_map: Dict[str, Dict] = defaultdict(lambda: {
        "count": 0,
        "promo_count": 0,
        "subjects": [],
        "name": "",
    })

    for msg in messages:
        headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
        from_header = headers.get("From", "")
        subject = headers.get("Subject", "")
        snippet = msg.get("snippet", "")

        email = extract_sender_email(from_header)
        name = extract_sender_name(from_header)

        sender_map[email]["count"] += 1
        sender_map[email]["name"] = name
        sender_map[email]["subjects"].append(subject)

        if is_promotional(subject, email, snippet):
            sender_map[email]["promo_count"] += 1

    result = []
    total_emails = len(messages)

    for email, data in sender_map.items():
        count = data["count"]
        promo_ratio = data["promo_count"] / count if count > 0 else 0

        # Fix 1: usa replied_to real — se não temos dados, assume False (sem penalidade)
        if replied_to is not None:
            never_replied = email not in replied_to
        else:
            never_replied = False

        score = calculate_score(count, promo_ratio, never_replied)
        percentage = round((count / total_emails) * 100, 1) if total_emails > 0 else 0

        result.append({
            "email": email,
            "name": data["name"] or email,
            "domain": extract_sender_domain(email),
            "count": count,
            "promo_ratio": round(promo_ratio, 2),
            "score": score,
            "percentage": percentage,
            "never_replied": never_replied,
        })

    result.sort(key=lambda x: x["count"], reverse=True)
    return result