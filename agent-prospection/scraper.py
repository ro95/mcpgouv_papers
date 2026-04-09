"""
Module de scraping : analyse le site web d'un prospect pour identifier
les problèmes concrets (design, technique, SEO, UX).
"""
import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin


def scrape_website(url: str) -> dict:
    """Scrape un site web et retourne une analyse structurée."""
    result = {
        "url": url,
        "accessible": False,
        "title": "",
        "meta_description": "",
        "technologies": [],
        "problemes": [],
        "contenu_brut": "",
        "pages_analysees": [],
    }

    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        }
        resp = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
        resp.raise_for_status()
        result["accessible"] = True
    except Exception as e:
        result["problemes"].append(f"Site inaccessible : {e}")
        return result

    soup = BeautifulSoup(resp.text, "html.parser")
    html = resp.text

    # Infos de base
    result["title"] = soup.title.string.strip() if soup.title and soup.title.string else ""
    meta_desc = soup.find("meta", attrs={"name": "description"})
    result["meta_description"] = meta_desc["content"] if meta_desc and meta_desc.get("content") else ""

    # Contenu texte (limité pour le prompt)
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()
    text = soup.get_text(separator=" ", strip=True)
    result["contenu_brut"] = text[:3000]

    # Détection de problèmes techniques
    _check_encoding(html, result)
    _check_https(url, result)
    _check_mobile(soup, result)
    _check_performance(html, result)
    _check_seo(soup, result)
    _check_design_signals(soup, html, result)
    _check_technologies(soup, html, result)

    # Essayer de scraper la page contact aussi
    _scrape_contact_page(url, headers, result)

    return result


def _check_encoding(html: str, result: dict):
    patterns = ["\xc3\xa9", "\xc3\xa8", "\xc3\xa0", "\xc3\xa7", "\xc3\xb4", "\xc3\xae", "\xc3\xa2"]
    found = [p for p in patterns if p in html]
    if found:
        result["problemes"].append(f"Problème d'encodage UTF-8 : caractères corrompus détectés ({', '.join(found[:3])})")


def _check_https(url: str, result: dict):
    if url.startswith("http://"):
        result["problemes"].append("Site en HTTP (pas HTTPS) — non sécurisé, pénalisé par Google")


def _check_mobile(soup, result: dict):
    viewport = soup.find("meta", attrs={"name": "viewport"})
    if not viewport:
        result["problemes"].append("Pas de meta viewport — site probablement pas responsive/mobile")


def _check_performance(html: str, result: dict):
    size_kb = len(html.encode("utf-8")) / 1024
    if size_kb > 500:
        result["problemes"].append(f"Page d'accueil très lourde ({size_kb:.0f} KB) — temps de chargement élevé")

    img_tags = re.findall(r"<img[^>]*>", html, re.I)
    no_alt = sum(1 for img in img_tags if 'alt=""' in img or "alt" not in img)
    if no_alt > 3:
        result["problemes"].append(f"{no_alt} images sans attribut alt — mauvais pour le SEO et l'accessibilité")


def _check_seo(soup, result: dict):
    h1s = soup.find_all("h1")
    if len(h1s) == 0:
        result["problemes"].append("Aucune balise H1 — structure SEO déficiente")
    elif len(h1s) > 1:
        result["problemes"].append(f"{len(h1s)} balises H1 sur la page d'accueil — devrait y en avoir une seule")

    if not result.get("meta_description"):
        result["problemes"].append("Pas de meta description — invisible pour Google")


def _check_design_signals(soup, html: str, result: dict):
    # Détection de sliders/carrousels (pattern obsolète)
    slider_patterns = ["slider", "carousel", "slick", "swiper", "owl-carousel", "flexslider"]
    for pattern in slider_patterns:
        if pattern in html.lower():
            result["problemes"].append("Carrousel/slider détecté en page d'accueil — pattern UX obsolète (baisse les conversions)")
            break

    # Détection de design daté via frameworks anciens
    old_frameworks = {
        "bootstrap/3": "Bootstrap 3 (framework CSS de 2013)",
        "bootstrap/2": "Bootstrap 2 (framework CSS de 2012)",
        "jquery-ui": "jQuery UI (composants visuels datés)",
    }
    for pattern, label in old_frameworks.items():
        if pattern in html.lower():
            result["problemes"].append(f"Utilise {label} — design potentiellement daté")
            break

    # Flash
    if "<embed" in html.lower() and "flash" in html.lower():
        result["problemes"].append("Contenu Flash détecté — technologie morte depuis 2020")

    # Pas de CTA clair
    cta_patterns = ["contact", "devis", "rdv", "rendez-vous", "réserver", "appel", "démonstration"]
    links = [a.get_text(strip=True).lower() for a in soup.find_all("a")]
    has_cta = any(any(p in link for p in cta_patterns) for link in links)
    if not has_cta:
        result["problemes"].append("Aucun appel à l'action clair (prise de RDV, contact, devis) visible")


def _check_technologies(soup, html: str, result: dict):
    techs = []
    if "wp-content" in html or "wordpress" in html.lower():
        techs.append("WordPress")
    if "wix.com" in html:
        techs.append("Wix")
    if "squarespace" in html.lower():
        techs.append("Squarespace")
    if "shopify" in html.lower():
        techs.append("Shopify")
    if "joomla" in html.lower():
        techs.append("Joomla")
    result["technologies"] = techs


def _scrape_contact_page(base_url: str, headers: dict, result: dict):
    contact_paths = ["/contact", "/contact/", "/nous-contacter", "/contactez-nous"]
    for path in contact_paths:
        try:
            contact_url = urljoin(base_url, path)
            resp = requests.get(contact_url, headers=headers, timeout=10)
            if resp.status_code == 200:
                result["pages_analysees"].append(contact_url)
                break
        except Exception:
            continue


def format_audit_for_prompt(audit: dict) -> str:
    """Formate l'audit en texte lisible pour le prompt Claude."""
    lines = [f"Site analysé : {audit['url']}"]
    if audit["title"]:
        lines.append(f"Titre : {audit['title']}")
    if audit["technologies"]:
        lines.append(f"Technologies : {', '.join(audit['technologies'])}")
    if audit["problemes"]:
        lines.append("\nProblèmes détectés :")
        for i, p in enumerate(audit["problemes"], 1):
            lines.append(f"  {i}. {p}")
    else:
        lines.append("\nAucun problème technique majeur détecté.")
    if audit["contenu_brut"]:
        lines.append(f"\nExtrait du contenu du site :\n{audit['contenu_brut'][:1500]}")
    return "\n".join(lines)
