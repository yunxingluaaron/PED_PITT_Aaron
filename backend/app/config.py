import os
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def construct_database_url():
    """Construct database URL from individual components or return complete URL"""
    # First try to get the complete DATABASE_URL
    database_url = os.getenv('DATABASE_URL')
    if database_url:
        return database_url
    
    # If no complete URL, construct from components
    DB_USER = os.getenv('DB_USER', 'postgres')
    DB_PASSWORD = os.getenv('DB_PASSWORD', 'postgres')
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = os.getenv('DB_PORT', '5432')
    DB_NAME = os.getenv('DB_NAME', 'ped_db')
    
    return f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

class Config:
    # Basic Flask Configuration
    SECRET_KEY = os.getenv('SECRET_KEY', 'default-secret-key')
    DEBUG = False
    TESTING = False
    ENV = os.getenv('FLASK_ENV', 'production')
    
    # Database Configuration
    SQLALCHEMY_DATABASE_URI = construct_database_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT Configuration
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', os.getenv('SECRET_KEY', 'default-secret-key'))
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=int(os.getenv('JWT_ACCESS_TOKEN_HOURS', '1')))
    
    # Elasticsearch Configuration
    ES_HOST = os.getenv('ES_HOST', 'localhost')
    ES_PORT = int(os.getenv('ES_PORT', '9200'))
    ES_INDEX = os.getenv('ES_INDEX', 'scd_literature')
    ES_USERNAME = os.getenv('ES_USERNAME', 'elastic')
    ES_PASSWORD = os.getenv('ES_PASSWORD', '')
    
    # OpenAI Configuration
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    
    # CORS Configuration
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*').split(',')

class DevelopmentConfig(Config):
    DEBUG = True
    DEVELOPMENT = True

class ProductionConfig(Config):
    DEBUG = False
    DEVELOPMENT = False

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'postgresql://postgres:postgres@localhost:5432/ped_test_db'

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}

# Create a settings instance
settings = config[os.getenv('FLASK_ENV', 'default')]()