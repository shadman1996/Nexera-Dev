"""
Nexera OS Automation — Browser Automation (Playwright)
SRS Phase 4, Item 2: playwright tools for browser automation
"""
import asyncio
import base64

try:
    from playwright.async_api import async_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False


async def run_playwright_crawl(url: str) -> dict:
    """Launch headless Chromium, navigate to URL, extract text and screenshot."""
    if not PLAYWRIGHT_AVAILABLE:
        return {
            "success": False,
            "log": "Playwright not installed. Run: pip install playwright && python -m playwright install chromium"
        }

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


async def take_page_screenshot(url: str, full_page: bool = False) -> dict:
    """Take a screenshot of a web page without text extraction."""
    if not PLAYWRIGHT_AVAILABLE:
        return {"success": False, "log": "Playwright not installed."}

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(url, wait_until="domcontentloaded", timeout=20000)
            screenshot_bytes = await page.screenshot(full_page=full_page, type="png")
            screenshot_b64 = "data:image/png;base64," + base64.b64encode(screenshot_bytes).decode()
            await browser.close()
            return {"success": True, "screenshot_url": screenshot_b64, "log": f"Screenshot of '{url}' captured."}
    except Exception as e:
        return {"success": False, "log": f"Screenshot error: {e}"}
