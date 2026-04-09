"""
Module d'envoi d'emails via Gmail SMTP.
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import GMAIL_ADDRESS, GMAIL_APP_PASSWORD, SENDER_NAME


def send_email(to_email: str, subject: str, body: str, dry_run: bool = True) -> dict:
    """Envoie un email via Gmail SMTP."""
    result = {"success": False, "message": "", "dry_run": dry_run}

    if dry_run:
        result["success"] = True
        result["message"] = f"[DRY RUN] Email simulé vers {to_email}"
        return result

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = f"{SENDER_NAME} <{GMAIL_ADDRESS}>"
        msg["To"] = to_email
        msg["Subject"] = subject

        # Version texte brut
        msg.attach(MIMEText(body, "plain", "utf-8"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(GMAIL_ADDRESS, GMAIL_APP_PASSWORD)
            server.send_message(msg)

        result["success"] = True
        result["message"] = f"Email envoyé à {to_email}"
    except Exception as e:
        result["message"] = f"Erreur d'envoi vers {to_email} : {e}"

    return result
