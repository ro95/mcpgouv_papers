# ============================================================
# CONFIGURATION DE L'AGENT DE PROSPECTION
# ============================================================
# Remplis les valeurs ci-dessous avant de lancer l'agent.

# --- Clé API Anthropic ---
# Crée un compte sur console.anthropic.com et génère une clé API
# Coût estimé : ~0.01€ par prospect (très peu cher)
ANTHROPIC_API_KEY = "sk-ant-..."

# --- Configuration Gmail ---
# 1. Active la validation en 2 étapes sur ton compte Google
# 2. Va sur https://myaccount.google.com/apppasswords
# 3. Crée un "mot de passe d'application" pour "Mail"
# 4. Copie le mot de passe généré ci-dessous (sans espaces)
GMAIL_ADDRESS = "ton.email@gmail.com"
GMAIL_APP_PASSWORD = "xxxx xxxx xxxx xxxx"

# --- Ton identité dans les emails ---
SENDER_NAME = "Rodolph"
SENDER_TITLE = "Développeur web"
SENDER_PHONE = ""  # Optionnel : ton numéro pour le CTA

# --- Fichier prospects ---
PROSPECTS_FILE = "../prospects-coaching-7022Z.xlsx"
PROSPECTS_HEADER_ROW = 2  # Ligne d'en-tête (0-indexed)

# --- Paramètres d'envoi ---
DELAY_BETWEEN_EMAILS = 120  # Secondes entre chaque email (évite le spam)
DRY_RUN = True  # True = simule sans envoyer / False = envoie réellement
MAX_EMAILS_PER_RUN = 5  # Limite par exécution

# --- Modèle Claude ---
CLAUDE_MODEL = "claude-sonnet-4-20250514"
