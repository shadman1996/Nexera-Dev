import re
import json
import os
import time
from backend.config import CONFIG_PATH, load_config

# Standard spelling corrections for common casual typos
TYPO_CORRECTIONS = {
    r"\bmkae\b": "make",
    r"\bpattarn\b": "pattern",
    r"\bchnage\b": "change",
    r"\bportrntial\b": "potential",
    r"\bgemewni\b": "gemini",
    r"\bexust\b": "exist",
    r"\bantivragivity\b": "antigravity",
    r"\bdynamiclly\b": "dynamically",
    r"\bmoduler\b": "modular",
    r"\bu\b": "you",
    r"\bdont\b": "don't",
    r"\bcant\b": "can't",
    r"\bshoud\b": "should",
    r"\bimpl\b": "implement",
    r"\bconfig\b": "configuration",
    r"\bgui\b": "ui",
    r"\bauth\b": "authentication",
    r"\bdb\b": "database",
    r"\bapilist\b": "api list"
}

DEFAULT_SHORTHANDS = {
    "api": "Build a clean, optimized FastAPI REST API router with model schemas, robust data validation, and fully responsive CRUD endpoints.",
    "ui": "Create a premium, responsive, and stunning user interface styled with custom CSS and modern animations.",
    "test": "Write structured, high-coverage unit tests and pytest test cases covering all successful execution and edge-case failure pathways.",
    "doc": "Update the technical markdown manuals inside the doc/ folder with modern, comprehensive setup instructions, configuration logs, and deployment schemas.",
    "git": "Initialize git, stage all active workspace modifications, and write a professional, descriptive commit message summarizing the updates.",
    "screen": "Run a remote desktop screen capture using capture_desktop, parse OCR characters, and index all visual active coordinates."
}

def load_patterns_config() -> dict:
    """Loads patterns from the global nexera.config.json, initializing if empty."""
    config = load_config()
    if "user_patterns" not in config:
        config["user_patterns"] = {
            "shorthands": DEFAULT_SHORTHANDS,
            "analytics": {
                "total_prompts": 0,
                "typo_corrections_made": 0,
                "shorthands_applied": 0,
                "total_characters_processed": 0,
                "adaptation_level": "High",
                "user_tone_perception": "Brief & Shorthand"
            }
        }
        # Save it
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
    return config["user_patterns"]

def save_patterns_config(patterns_data: dict) -> bool:
    """Saves updated user patterns and shorthand dictionary back to disk."""
    try:
        config = load_config()
        config["user_patterns"] = patterns_data
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error saving user patterns config: {e}")
        return False

def add_shorthand(trigger: str, expansion: str) -> bool:
    """Adds or updates a shorthand trigger."""
    patterns = load_patterns_config()
    patterns["shorthands"][trigger.strip().lower()] = expansion.strip()
    return save_patterns_config(patterns)

def delete_shorthand(trigger: str) -> bool:
    """Deletes a custom shorthand trigger."""
    patterns = load_patterns_config()
    trigger_clean = trigger.strip().lower()
    if trigger_clean in patterns["shorthands"]:
        del patterns["shorthands"][trigger_clean]
        return save_patterns_config(patterns)
    return False

def clean_and_expand_prompt(raw_prompt: str, record_stats: bool = True) -> dict:
    """
    Parses user prompts, applies typo correction matrices,
    expands matching shorthands, and logs statistics.
    """
    if not raw_prompt:
        return {"original": "", "expanded": "", "typos": [], "shorthands": []}

    patterns = load_patterns_config()
    shorthands_map = patterns.get("shorthands", DEFAULT_SHORTHANDS)
    analytics = patterns.get("analytics", {})

    processed = raw_prompt.strip()
    typos_corrected = []
    shorthands_expanded = []

    # 1. Correct Typos
    for typo_pattern, correction in TYPO_CORRECTIONS.items():
        if re.search(typo_pattern, processed, re.IGNORECASE):
            # Track correction
            matched_words = re.findall(typo_pattern, processed, re.IGNORECASE)
            for word in matched_words:
                typos_corrected.append(f"'{word}' -> '{correction}'")
            
            # Apply correction
            processed = re.sub(typo_pattern, correction, processed, flags=re.IGNORECASE)

    # 2. Expand Shorthands
    # Tokenize by words and punctuation to check shorthand triggers
    words = re.findall(r"\b[a-zA-Z0-9_-]+\b", processed)
    for word in words:
        word_lower = word.lower()
        if word_lower in shorthands_map:
            expansion = shorthands_map[word_lower]
            # Replace exactly the word boundaries
            processed = re.sub(rf"\b{word}\b", expansion, processed, count=1)
            shorthands_expanded.append(f"{word} -> [Expanded]")

    # 3. Update Analytics
    if record_stats:
        analytics["total_prompts"] = analytics.get("total_prompts", 0) + 1
        analytics["typo_corrections_made"] = analytics.get("typo_corrections_made", 0) + len(typos_corrected)
        analytics["shorthands_applied"] = analytics.get("shorthands_applied", 0) + len(shorthands_expanded)
        analytics["total_characters_processed"] = analytics.get("total_characters_processed", 0) + len(raw_prompt)
        
        # Deduce user tone perception based on style characteristics
        avg_len = analytics["total_characters_processed"] / analytics["total_prompts"]
        if avg_len < 30:
            analytics["user_tone_perception"] = "Highly Casual & Shorthand"
        elif avg_len < 80:
            analytics["user_tone_perception"] = "Conversational Shorthand"
        else:
            analytics["user_tone_perception"] = "Detailed & Direct"

        patterns["analytics"] = analytics
        save_patterns_config(patterns)

    return {
        "original": raw_prompt,
        "expanded": processed,
        "typos_corrected": typos_corrected,
        "shorthands_expanded": shorthands_expanded,
        "analytics": analytics
    }
