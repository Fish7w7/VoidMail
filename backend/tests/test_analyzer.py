from analyzer import (
    aggregate_senders,
    calculate_health_score,
    calculate_score,
    extract_sender_domain,
    extract_sender_email,
    is_promotional,
)


def gmail_message(sender: str, subject: str, snippet: str = "") -> dict:
    return {
        "payload": {
            "headers": [
                {"name": "From", "value": sender},
                {"name": "Subject", "value": subject},
            ]
        },
        "snippet": snippet,
    }


def test_extract_sender_email_and_domain():
    email = extract_sender_email('"Acme News" <news@mail.acme.com>')

    assert email == "news@mail.acme.com"
    assert extract_sender_domain(email) == "mail.acme.com"


def test_promotional_detection_uses_subject_sender_and_snippet():
    assert is_promotional("Oferta exclusiva", "store@example.com", "") is True
    assert is_promotional("Receipt", "alerts@mailchimp.example", "") is True
    assert is_promotional("Meeting notes", "person@example.com", "See attached") is False


def test_score_increases_with_volume_promo_and_no_reply():
    low = calculate_score(count=2, promo_ratio=0, never_replied=False)
    high = calculate_score(count=50, promo_ratio=1, never_replied=True)

    assert low == 0
    assert high == 100


def test_aggregate_senders_respects_replied_to():
    messages = [
        gmail_message("Store <promo@example.com>", "Sale now"),
        gmail_message("Store <promo@example.com>", "Limited time deal"),
        gmail_message("Friend <friend@example.com>", "Dinner"),
    ]

    senders = aggregate_senders(messages, replied_to={"friend@example.com"})
    by_email = {sender["email"]: sender for sender in senders}

    assert by_email["promo@example.com"]["count"] == 2
    assert by_email["promo@example.com"]["never_replied"] is True
    assert by_email["friend@example.com"]["never_replied"] is False
    assert by_email["promo@example.com"]["score"] > by_email["friend@example.com"]["score"]


def test_health_score_tracks_toxic_email_ratio():
    health = calculate_health_score(
        [
            {"count": 8, "score": 80},
            {"count": 2, "score": 20},
        ]
    )

    assert health == 19
