import os
import json
import time

# Setup config path relative to the runtime directory
CONFIG_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "nexera.config.json"))

DEFAULT_CONFIG = {
    "project": {
        "name": "Nexera Automation OS",
        "version": "1.0.0",
        "codename": "Genesis",
        "config_version": 1,
        "config_history": [
            {
                "timestamp": "2026-05-22T02:00:00Z",
                "version": 1,
                "change": "Initial system generation"
            }
        ]
    },
    "hardware": {
        "cpu": "Local CPU",
        "cpu_cores": 4,
        "ram_gb": 8,
        "max_docker_ram_gb": 2,
        "gpu": "Local GPU",
        "vram_gb": 4
    },
    "model": {
        "provider": "ollama",
        "name": "qwen2.5-coder:7b-instruct-q4_K_M",
        "max_context_tokens": 8192,
        "temperature": 0.1,
        "estimated_vram_gb": 4.5,
        "base_url": "http://127.0.0.1:11434"
    },
    "api_keys": {
        "gemini": "",
        "openai": "",
        "anthropic": ""
    },
    "fallback_model": {
        "provider": "gemini",
        "name": "gemini-1.5-pro",
        "api_key_env": "GEMINI_API_KEY",
        "use_for": ["vision", "large_context", "web_research"]
    }
}

def load_config() -> dict:
    """Loads the active configuration file or falls back to system defaults."""
    if not os.path.exists(CONFIG_PATH):
        return DEFAULT_CONFIG
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            # Ensure required structures exist
            if "project" not in data:
                data["project"] = DEFAULT_CONFIG["project"]
            if "api_keys" not in data:
                data["api_keys"] = DEFAULT_CONFIG["api_keys"]
            if "config_version" not in data["project"]:
                data["project"]["config_version"] = 1
            if "config_history" not in data["project"]:
                data["project"]["config_history"] = []
            return data
    except Exception as e:
        print(f"Error loading configuration: {e}")
        return DEFAULT_CONFIG

def save_config(config_data: dict) -> bool:
    """Validates and persists updated configuration structures on disk with version control."""
    try:
        current = load_config()
        
        # Helper to merge nested dicts
        def merge_dicts(dict1, dict2):
            for k, v in dict2.items():
                if k in dict1 and isinstance(dict1[k], dict) and isinstance(v, dict):
                    merge_dicts(dict1[k], v)
                else:
                    dict1[k] = v

        merge_dicts(current, config_data)
        
        # Increment version control
        v = current["project"].get("config_version", 1) + 1
        current["project"]["config_version"] = v
        
        # Build history log entry
        timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        history_entry = {
            "timestamp": timestamp,
            "version": v,
            "change": f"Updated settings (Model: {current['model'].get('name')}, Provider: {current['model'].get('provider')})"
        }
        
        history = current["project"].get("config_history", [])
        history.insert(0, history_entry)
        current["project"]["config_history"] = history[:10]  # limit to last 10 entries
        
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(current, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error saving configuration: {e}")
        return False
