from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from flask_sqlalchemy import SQLAlchemy
from .config import settings

db = SQLAlchemy()

Base = declarative_base()

def init_db(app):
    db.init_app(app)
    with app.app_context():
        db.create_all()