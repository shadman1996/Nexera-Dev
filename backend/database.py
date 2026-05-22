import asyncio
from sqlalchemy import create_engine, Column, Integer, String, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timezone

def get_naive_utc():
    return datetime.now(timezone.utc).replace(tzinfo=None)

Base = declarative_base()

class AgentLogs(Base):
    __tablename__ = 'agent_logs'
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, default=get_naive_utc)
    agent_name = Column(String)
    action = Column(String)
    result = Column(String)
    phase = Column(String)

class GitChangelogs(Base):
    __tablename__ = 'git_changelogs'
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, default=get_naive_utc)
    commit_hash = Column(String)
    message = Column(String)
    files_changed = Column(JSON)

class BuildState(Base):
    __tablename__ = 'build_state'
    phase = Column(String, primary_key=True)
    status = Column(String)
    files_json = Column(JSON)

from sqlalchemy.ext.asyncio import create_async_engine

async def init_db():
    engine = create_async_engine('sqlite+aiosqlite:///./db.sqlite3', echo=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    return engine