import asyncio
import base64

try:
    import pyautogui
    pyautogui.FAILSAFE = True
except ImportError:
    pyautogui = None

try:
    from playwright.async_api import async_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False


def trigger_mouse_click(x: int, y: int) -> dict:
    if pyautogui:
        try:
            pyautogui.click(x, y)
            return {"success": True, "log": f"Mouse click at ({x}, {y}) executed."}
        except Exception as e:
            return {"success": False, "log": f"pyautogui click error: {e}"}
    return {"success": True, "log": f"[SIMULATED] Mouse click at ({x}, {y})."}


def trigger_key_sequence(text: str) -> dict:
    if pyautogui:
        try:
            pyautogui.write(text, interval=0.05)
            return {"success": True, "log": f"Typed: '{text}'"}
        except Exception as e:
            return {"success": False, "log": f"pyautogui write error: {e}"}
    return {"success": True, "log": f"[SIMULATED] Typed: '{text}'"}


async def run_playwright_crawl(url: str) -> dict:
    """Launch headless Chromium, navigate to URL, extract text and screenshot."""
    if not PLAYWRIGHT_AVAILABLE:
        return {"success": False, "log": "Playwright not installed. Run: pip install playwright && python -m playwright install chromium"}

    if not url or not url.startswith(("http://", "https://")):
        return {"success": False, "log": f"Invalid URL: '{url}'. Must start with http:// or https://"}

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                viewport={"width": 1280, "height": 800},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) NexeraBot/1.0"
            )
            page = await context.new_page()

            await page.goto(url, wait_until="domcontentloaded", timeout=20000)
            title = await page.title()

            # Extract visible text (strip scripts/styles)
            text = await page.evaluate("""() => {
                const els = document.querySelectorAll('script, style, noscript');
                els.forEach(e => e.remove());
                return document.body ? document.body.innerText.slice(0, 4000) : '';
            }""")

            screenshot_bytes = await page.screenshot(full_page=False, type="png")
            screenshot_b64 = "data:image/png;base64," + base64.b64encode(screenshot_bytes).decode()

            await browser.close()

            return {
                "success": True,
                "log": f"Crawled '{url}' — title: \"{title}\"",
                "title": title,
                "text": text.strip(),
                "screenshot_url": screenshot_b64,
            }

    except Exception as e:
        return {"success": False, "log": f"Playwright crawl error: {e}", "text": "", "screenshot_url": ""}
