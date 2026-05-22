"""
Nexera OS Automation — CTO Approval Gate
SRS Phase 4, Item 3: CTO approval gate before any OS-level action

All OS-level automation actions (mouse clicks, keyboard typing, browser
launches) must pass through this gate. The gate checks the approval queue
and blocks execution until a CTO decision is received.
"""
import asyncio


async def require_cto_approval(
    action_description: str,
    approval_queue: dict,
    websocket_manager=None,
    timeout_seconds: int = 300
) -> dict:
    """
    Blocks execution until CTO approves or rejects an OS-level automation action.

    Args:
        action_description: Human-readable description of the action to perform
        approval_queue: Shared approval queue dict from graph.py
        websocket_manager: WebSocket manager for broadcasting notifications
        timeout_seconds: Maximum seconds to wait for approval (default: 5 minutes)

    Returns:
        dict with 'approved' (bool), 'notes' (str), and 'timed_out' (bool)
    """
    # Stage the action for CTO review
    approval_queue["pending"] = {
        "filepath": "[OS Automation]",
        "content": f"🤖 OS-Level Action Requires CTO Approval:\n\n{action_description}",
        "original_content": ""
    }
    approval_queue["status"] = None
    approval_queue["notes"] = ""

    if websocket_manager:
        await websocket_manager.broadcast({
            "type": "system",
            "message": f"🛡️ [CTO Gate]: OS automation action staged for approval: '{action_description}'"
        })

    # Polling wait loop with timeout
    elapsed = 0
    poll_interval = 1.0
    while approval_queue["status"] is None:
        if elapsed >= timeout_seconds:
            approval_queue["pending"] = None
            approval_queue["status"] = None
            if websocket_manager:
                await websocket_manager.broadcast({
                    "type": "error",
                    "message": f"⏰ [CTO Gate]: Approval timeout ({timeout_seconds}s). Action blocked."
                })
            return {"approved": False, "notes": "Timed out waiting for CTO approval", "timed_out": True}

        await asyncio.sleep(poll_interval)
        elapsed += poll_interval

    decision = approval_queue["status"]
    notes = approval_queue["notes"]

    # Clean up queue
    approval_queue["pending"] = None
    approval_queue["status"] = None
    approval_queue["notes"] = ""

    approved = decision == "approved"

    if websocket_manager:
        status_icon = "✅" if approved else "❌"
        await websocket_manager.broadcast({
            "type": "system",
            "message": f"{status_icon} [CTO Gate]: OS action {'APPROVED' if approved else 'REJECTED'}{' — ' + notes if notes else ''}"
        })

    return {"approved": approved, "notes": notes, "timed_out": False}
