"""
Nexera OS Automation — Mouse & Keyboard Control (pyautogui)
SRS Phase 4, Item 1: pyautogui tools for mouse/keyboard control
"""
try:
    import pyautogui
    pyautogui.FAILSAFE = True
except ImportError:
    pyautogui = None


def trigger_mouse_click(x: int, y: int) -> dict:
    """Execute a mouse click at the specified screen coordinates."""
    if pyautogui:
        try:
            pyautogui.click(x, y)
            return {"success": True, "log": f"Mouse click at ({x}, {y}) executed."}
        except Exception as e:
            return {"success": False, "log": f"pyautogui click error: {e}"}
    return {"success": True, "log": f"[SIMULATED] Mouse click at ({x}, {y})."}


def trigger_key_sequence(text: str) -> dict:
    """Type a sequence of characters using pyautogui."""
    if pyautogui:
        try:
            pyautogui.write(text, interval=0.05)
            return {"success": True, "log": f"Typed: '{text}'"}
        except Exception as e:
            return {"success": False, "log": f"pyautogui write error: {e}"}
    return {"success": True, "log": f"[SIMULATED] Typed: '{text}'"}


def trigger_hotkey(*keys: str) -> dict:
    """Press a keyboard hotkey combination (e.g., 'ctrl', 'shift', 'n')."""
    if pyautogui:
        try:
            pyautogui.hotkey(*keys)
            return {"success": True, "log": f"Hotkey pressed: {'+'.join(keys)}"}
        except Exception as e:
            return {"success": False, "log": f"pyautogui hotkey error: {e}"}
    return {"success": True, "log": f"[SIMULATED] Hotkey: {'+'.join(keys)}"}


def move_mouse(x: int, y: int, duration: float = 0.3) -> dict:
    """Move the mouse cursor to the specified coordinates."""
    if pyautogui:
        try:
            pyautogui.moveTo(x, y, duration=duration)
            return {"success": True, "log": f"Mouse moved to ({x}, {y})"}
        except Exception as e:
            return {"success": False, "log": f"pyautogui move error: {e}"}
    return {"success": True, "log": f"[SIMULATED] Mouse moved to ({x}, {y})"}
