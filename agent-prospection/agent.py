#!/usr/bin/env python3
"""
AGENT DE PROSPECTION AUTOMATISÉ
================================
Lit un fichier Excel de prospects, scrape chaque site web,
génère un email personnalisé via Claude, et l'envoie.

Usage :
    python agent.py                     # Mode dry-run (simule tout)
    python agent.py --send              # Envoie réellement les emails
    python agent.py --test              # Test avec un prospect fictif
    python agent.py fichier.xlsx        # Utilise un fichier spécifique
    python agent.py fichier.xlsx --send # Fichier spécifique + envoi réel
"""
import sys
import os
import time
import json
from datetime import datetime

import pandas as pd

# Ajouter le répertoire courant au path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import (
    PROSPECTS_FILE, PROSPECTS_HEADER_ROW,
    DELAY_BETWEEN_EMAILS, DRY_RUN, MAX_EMAILS_PER_RUN,
    ANTHROPIC_API_KEY,
)
from scraper import scrape_website, format_audit_for_prompt
from email_generator import generate_email, generate_email_mock
from sender import send_email


# Prospect fictif pour les tests
FAKE_PROSPECT = {
    "entreprise": "Excellence Coaching Paris",
    "site_web": "https://www.excellence-coaching-fictif.fr",
    "email": "contact@excellence-coaching-fictif.fr",
    "fake_audit": {
        "url": "https://www.excellence-coaching-fictif.fr",
        "accessible": True,
        "title": "Excellence Coaching - Accompagnement dirigeants",
        "meta_description": "",
        "technologies": ["WordPress"],
        "problemes": [
            "Pas de meta description — invisible pour Google",
            "Carrousel/slider détecté en page d'accueil — pattern UX obsolète (baisse les conversions)",
            "Utilise Bootstrap 3 (framework CSS de 2013) — design potentiellement daté",
            "5 images sans attribut alt — mauvais pour le SEO et l'accessibilité",
            "Aucun appel à l'action clair (prise de RDV, contact, devis) visible",
        ],
        "contenu_brut": (
            "Excellence Coaching accompagne les dirigeants et managers dans leur développement "
            "professionnel depuis 2015. Notre approche combine coaching individuel, formations "
            "en leadership et accompagnement d'équipes. Certifiés ICF et EMCC. "
            "Nos domaines : leadership, gestion du changement, cohésion d'équipe, "
            "prise de poste, gestion du stress. Plus de 200 dirigeants accompagnés."
        ),
        "pages_analysees": [],
    },
}


def run_test():
    """Test avec un prospect fictif — pas besoin de clé API ni de réseau."""
    print("=" * 60)
    print("  TEST AGENT — PROSPECT FICTIF")
    print("=" * 60)

    prospect = FAKE_PROSPECT
    audit = prospect["fake_audit"]
    audit_text = format_audit_for_prompt(audit)

    print(f"\n{'─' * 60}")
    print(f"PROSPECT : {prospect['entreprise']}")
    print(f"SITE     : {prospect['site_web']}")
    print(f"EMAIL    : {prospect['email']}")
    print(f"{'─' * 60}")

    print("\n📋 AUDIT DU SITE :")
    print(audit_text)

    # Générer l'email (mode mock sans API)
    print(f"\n{'─' * 60}")
    print("✉️  EMAIL GÉNÉRÉ :")
    print(f"{'─' * 60}")

    email = generate_email_mock(
        entreprise=prospect["entreprise"],
        site_web=prospect["site_web"],
        audit_text=audit_text,
    )

    print(f"\n  Objet : {email['objet']}")
    print(f"\n{email['corps']}")
    print(f"\n{'─' * 60}")
    print("[DRY RUN] Email NON envoyé (mode test)")
    print(f"{'─' * 60}")

    return email


def run_agent(xlsx_path: str = None, force_send: bool = False):
    """Exécute l'agent sur un fichier Excel de prospects."""
    filepath = xlsx_path or os.path.join(os.path.dirname(__file__), PROSPECTS_FILE)
    dry_run = DRY_RUN and not force_send

    print("=" * 60)
    print(f"  AGENT DE PROSPECTION — {'DRY RUN' if dry_run else 'ENVOI RÉEL'}")
    print(f"  Fichier : {filepath}")
    print(f"  Date    : {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    print("=" * 60)

    # Charger les prospects
    df = pd.read_excel(filepath, header=PROSPECTS_HEADER_ROW)
    prospects = df.dropna(subset=["Entreprise", "Site Web", "Email"]).head(MAX_EMAILS_PER_RUN)

    print(f"\n📊 {len(prospects)} prospect(s) à traiter\n")

    results = []
    use_mock = not ANTHROPIC_API_KEY or ANTHROPIC_API_KEY.startswith("sk-ant-...")

    for idx, row in prospects.iterrows():
        entreprise = row["Entreprise"]
        site_web = row["Site Web"]
        email_addr = row["Email"]
        statut = row.get("Statut", "")

        # Skip si déjà envoyé
        if isinstance(statut, str) and "envoyé" in statut.lower():
            print(f"⏭  {entreprise} — déjà envoyé, skip")
            continue

        print(f"\n{'─' * 60}")
        print(f"🔍 Prospect {idx + 1} : {entreprise}")
        print(f"   Site : {site_web}")
        print(f"   Email : {email_addr}")

        # 1. Scraper le site
        print(f"   ⏳ Analyse du site en cours...")
        audit = scrape_website(site_web)
        audit_text = format_audit_for_prompt(audit)

        nb_problems = len(audit["problemes"])
        print(f"   ✅ {nb_problems} problème(s) détecté(s)")

        if nb_problems == 0:
            print(f"   ⚠️  Aucun problème trouvé — email non envoyé (pas d'accroche)")
            results.append({
                "entreprise": entreprise,
                "status": "skip_no_problems",
                "problems": 0,
            })
            continue

        # 2. Générer l'email
        print(f"   ⏳ Génération de l'email personnalisé...")
        if use_mock:
            email = generate_email_mock(entreprise, site_web, audit_text)
            print(f"   ⚠️  Mode mock (pas de clé API configurée)")
        else:
            email = generate_email(entreprise, site_web, audit_text)

        print(f"   ✅ Objet : {email['objet']}")

        # 3. Afficher l'email
        print(f"\n   ✉️  APERÇU :")
        for line in email["corps"].split("\n"):
            print(f"   │ {line}")

        # 4. Envoyer (ou simuler)
        send_result = send_email(email_addr, email["objet"], email["corps"], dry_run=dry_run)
        print(f"\n   {'📤' if send_result['success'] else '❌'} {send_result['message']}")

        results.append({
            "entreprise": entreprise,
            "email": email_addr,
            "objet": email["objet"],
            "status": "sent" if send_result["success"] and not dry_run else "simulated",
            "problems": nb_problems,
            "timestamp": datetime.now().isoformat(),
        })

        # Délai entre les envois
        if not dry_run and idx < len(prospects) - 1:
            print(f"   ⏳ Pause de {DELAY_BETWEEN_EMAILS}s avant le prochain envoi...")
            time.sleep(DELAY_BETWEEN_EMAILS)

    # Résumé
    print(f"\n{'=' * 60}")
    print(f"  RÉSUMÉ : {len(results)} prospect(s) traité(s)")
    for r in results:
        status_icon = "✅" if r["status"] in ("sent", "simulated") else "⏭"
        print(f"  {status_icon} {r['entreprise']} — {r['status']} ({r['problems']} problèmes)")
    print(f"{'=' * 60}")

    # Sauvegarder le log
    log_path = os.path.join(os.path.dirname(__file__), "log_envois.json")
    with open(log_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"\n📝 Log sauvegardé : {log_path}")

    return results


if __name__ == "__main__":
    args = sys.argv[1:]

    if "--test" in args:
        run_test()
    elif args:
        xlsx_file = None
        force_send = "--send" in args
        for a in args:
            if a.endswith(".xlsx"):
                xlsx_file = a
        run_agent(xlsx_path=xlsx_file, force_send=force_send)
    else:
        run_agent()
