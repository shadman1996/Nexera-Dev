# Nexera OS Automation Module
# SRS Phase 4: OS Automation Integration
from automation.mouse_keyboard import trigger_mouse_click, trigger_key_sequence
from automation.browser import run_playwright_crawl
from automation.screenshot import capture_desktop
from automation.approval_gate import require_cto_approval
