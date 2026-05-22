import unittest
import os
import json
from unittest.mock import patch
import asyncio

import backend.config as config
import backend.pattern_engine as pattern_engine
from backend.database import Base, AgentLogs, GitChangelogs, BuildState
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

TEST_CONFIG_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_nexera.config.json"))

class TestBackendConfig(unittest.TestCase):
    def setUp(self):
        # Patch CONFIG_PATH to prevent modifying user configuration
        self.config_path_patcher = patch('backend.config.CONFIG_PATH', TEST_CONFIG_PATH)
        self.pattern_path_patcher = patch('backend.pattern_engine.CONFIG_PATH', TEST_CONFIG_PATH)
        self.config_path_patcher.start()
        self.pattern_path_patcher.start()
        
        if os.path.exists(TEST_CONFIG_PATH):
            os.remove(TEST_CONFIG_PATH)

    def tearDown(self):
        self.config_path_patcher.stop()
        self.pattern_path_patcher.stop()
        if os.path.exists(TEST_CONFIG_PATH):
            os.remove(TEST_CONFIG_PATH)

    def test_load_default_config(self):
        cfg = config.load_config()
        self.assertEqual(cfg["project"]["name"], "Nexera Automation OS")
        self.assertEqual(cfg["model"]["provider"], "ollama")

    def test_save_and_load_config(self):
        cfg = config.load_config()
        cfg["model"]["name"] = "nexera-test-model"
        success = config.save_config(cfg)
        self.assertTrue(success)
        
        # Load and verify
        loaded = config.load_config()
        self.assertEqual(loaded["model"]["name"], "nexera-test-model")
        self.assertTrue(loaded["project"]["config_version"] > 1)
        self.assertTrue(len(loaded["project"]["config_history"]) > 0)


class TestPatternEngine(unittest.TestCase):
    def setUp(self):
        self.config_path_patcher = patch('backend.config.CONFIG_PATH', TEST_CONFIG_PATH)
        self.pattern_path_patcher = patch('backend.pattern_engine.CONFIG_PATH', TEST_CONFIG_PATH)
        self.config_path_patcher.start()
        self.pattern_path_patcher.start()
        
        if os.path.exists(TEST_CONFIG_PATH):
            os.remove(TEST_CONFIG_PATH)

    def tearDown(self):
        self.config_path_patcher.stop()
        self.pattern_path_patcher.stop()
        if os.path.exists(TEST_CONFIG_PATH):
            os.remove(TEST_CONFIG_PATH)

    def test_typo_correction(self):
        res = pattern_engine.clean_and_expand_prompt("mkae a chnage to the core", record_stats=False)
        self.assertIn("make", res["expanded"])
        self.assertIn("change", res["expanded"])
        self.assertTrue(len(res["typos_corrected"]) >= 2)

    def test_shorthand_expansion(self):
        res = pattern_engine.clean_and_expand_prompt("api", record_stats=False)
        self.assertIn("FastAPI REST API", res["expanded"])
        self.assertTrue(len(res["shorthands_expanded"]) > 0)

    def test_custom_shorthands(self):
        success = pattern_engine.add_shorthand("greet", "Hello Nexera OS World!")
        self.assertTrue(success)
        
        res = pattern_engine.clean_and_expand_prompt("greet app", record_stats=False)
        self.assertIn("Hello Nexera OS World!", res["expanded"])
        
        # Delete shorthand
        success_delete = pattern_engine.delete_shorthand("greet")
        self.assertTrue(success_delete)
        
        res_deleted = pattern_engine.clean_and_expand_prompt("greet app", record_stats=False)
        self.assertNotIn("Hello Nexera OS World!", res_deleted["expanded"])

    def test_analytics_recording(self):
        res = pattern_engine.clean_and_expand_prompt("mkae a api", record_stats=True)
        analytics = res["analytics"]
        self.assertTrue(analytics["total_prompts"] >= 1)
        self.assertTrue(analytics["typo_corrections_made"] >= 1)
        self.assertTrue(analytics["shorthands_applied"] >= 1)


class TestDatabase(unittest.IsolatedAsyncioTestCase):
    async def test_database_creation_and_insertion(self):
        # Create an async in-memory SQLite database
        engine = create_async_engine('sqlite+aiosqlite:///:memory:', echo=False)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            
        async_session = sessionmaker(
            engine, class_=AsyncSession, expire_on_commit=False
        )
        
        async with async_session() as session:
            # Create a log entry
            log = AgentLogs(
                agent_name="CI_Swarm_Tester",
                action="Database validation test run",
                result="Schema integrity verified",
                phase="testing"
            )
            session.add(log)
            await session.commit()
            
        # Verify the insertion
        async with async_session() as session:
            from sqlalchemy import select
            result = await session.execute(select(AgentLogs).where(AgentLogs.agent_name == "CI_Swarm_Tester"))
            logs = result.scalars().all()
            self.assertEqual(len(logs), 1)
            self.assertEqual(logs[0].action, "Database validation test run")
            self.assertEqual(logs[0].result, "Schema integrity verified")
            
        await engine.dispose()


from fastapi.testclient import TestClient
from backend.main import app

class TestSecurityMiddleware(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        
        # Patch CONFIG_PATH to prevent modifying user configuration
        self.config_path_patcher = patch('backend.config.CONFIG_PATH', TEST_CONFIG_PATH)
        self.config_path_patcher.start()
        
        if os.path.exists(TEST_CONFIG_PATH):
            os.remove(TEST_CONFIG_PATH)

    def tearDown(self):
        self.config_path_patcher.stop()
        if os.path.exists(TEST_CONFIG_PATH):
            os.remove(TEST_CONFIG_PATH)

    def test_access_denied_without_header(self):
        # Query /api/status without X-Nexera-Key header
        response = self.client.get("/api/status")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json(), {"message": "Unauthorized: Invalid or missing X-Nexera-Key header."})

    def test_access_denied_with_wrong_header(self):
        # Query /api/status with a wrong X-Nexera-Key header
        response = self.client.get("/api/status", headers={"X-Nexera-Key": "wrong_key_value"})
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json(), {"message": "Unauthorized: Invalid or missing X-Nexera-Key header."})

    def test_access_granted_with_valid_header(self):
        # Query /api/status with the correct X-Nexera-Key header
        response = self.client.get("/api/status", headers={"X-Nexera-Key": "nexera_master_key_2026"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json().get("status"), "online")


if __name__ == '__main__':
    unittest.main()
