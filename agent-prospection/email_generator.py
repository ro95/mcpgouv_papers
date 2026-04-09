"""
Module de génération d'emails personnalisés via Claude API.
Analyse l'audit du site web et produit un email adapté au prospect.
"""
import anthropic
from config import ANTHROPIC_API_KEY, CLAUDE_MODEL, SENDER_NAME, SENDER_TITLE, SENDER_PHONE

SYSTEM_PROMPT = """Tu es un expert en copywriting B2B et prospection commerciale.
Tu rédiges des emails de prospection à froid pour un développeur web freelance qui cible les coachs business et consultants.

RÈGLES ABSOLUES :
1. L'email doit se lire en moins de 20 secondes
2. Commence par un CONSTAT RÉEL trouvé sur le site du prospect (pas de flatterie vide)
3. Maximum 6-8 lignes de corps de texte
4. UN SEUL appel à l'action clair (15 min d'appel)
5. Ton : direct, professionnel, légèrement informel. Pas de jargon technique
6. Ne jamais être agressif ou condescendant sur l'état du site
7. Mentionner l'outil IA (diagnostic automatisé) comme teaser — c'est le différenciateur
8. L'objet doit être court, intrigant, et mentionner le nom du site ou de l'entreprise
9. NE PAS utiliser de formules creuses ("je me permets de...", "n'hésitez pas à...")
10. Signer avec le prénom uniquement

FORMAT DE SORTIE (respecter exactement) :
OBJET: [l'objet de l'email]
---
[corps de l'email, prêt à envoyer]"""

USER_PROMPT_TEMPLATE = """Voici l'audit du site web d'un prospect coach/consultant.
Rédige un email de prospection personnalisé basé sur les problèmes RÉELS constatés.

INFORMATIONS SUR LE PROSPECT :
- Entreprise : {entreprise}
- Site web : {site_web}

AUDIT DU SITE :
{audit}

INFORMATIONS SUR L'EXPÉDITEUR :
- Prénom : {sender_name}
- Métier : {sender_title}

Rédige l'email maintenant."""


def generate_email(entreprise: str, site_web: str, audit_text: str, api_key: str = None) -> dict:
    """Génère un email personnalisé via Claude API."""
    key = api_key or ANTHROPIC_API_KEY
    client = anthropic.Anthropic(api_key=key)

    prompt = USER_PROMPT_TEMPLATE.format(
        entreprise=entreprise,
        site_web=site_web,
        audit=audit_text,
        sender_name=SENDER_NAME,
        sender_title=SENDER_TITLE,
    )

    response = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=500,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = response.content[0].text
    return _parse_email(raw)


def generate_email_mock(entreprise: str, site_web: str, audit_text: str) -> dict:
    """Version mock pour tester sans clé API. Simule une réponse Claude."""
    # Extraire le premier problème de l'audit pour personnaliser
    problems = []
    for line in audit_text.split("\n"):
        line = line.strip()
        if line and line[0].isdigit() and "." in line[:3]:
            problems.append(line.split(".", 1)[1].strip())

    problem_mention = problems[0] if problems else "quelques points d'amélioration repérés"

    mock_response = f"""OBJET: {site_web.replace('https://', '').replace('http://', '').rstrip('/')} — un constat + une idée

---
Bonjour,

En analysant votre site, j'ai repéré un point concret : {problem_mention.lower()}.

C'est le genre de détail qui peut freiner un prospect avant même qu'il vous contacte.

Je suis développeur web, je travaille avec des coachs et consultants. Au-delà d'une correction, je peux intégrer un outil IA qui qualifie vos visiteurs automatiquement — vos concurrents ne l'ont pas encore.

15 min pour vous montrer ?

{SENDER_NAME}"""

    return _parse_email(mock_response)


def _parse_email(raw: str) -> dict:
    """Parse la sortie brute en objet + corps."""
    result = {"objet": "", "corps": "", "raw": raw}

    if "OBJET:" in raw:
        parts = raw.split("---", 1)
        result["objet"] = parts[0].replace("OBJET:", "").strip()
        if len(parts) > 1:
            result["corps"] = parts[1].strip()
        else:
            result["corps"] = raw.split("\n", 1)[1].strip() if "\n" in raw else raw
    else:
        lines = raw.strip().split("\n")
        result["objet"] = lines[0].strip()
        result["corps"] = "\n".join(lines[1:]).strip()

    return result
