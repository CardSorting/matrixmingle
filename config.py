# config.py

import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///app.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    AUTH0_CLIENT_ID = os.environ.get('AUTH0_CLIENT_ID')
    AUTH0_CLIENT_SECRET = os.environ.get('AUTH0_CLIENT_SECRET')
    AUTH0_DOMAIN = os.environ.get('AUTH0_DOMAIN')
    AUTH0_CALLBACK_URL = os.environ.get('AUTH0_CALLBACK_URL')
    REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6380/0')
    CELERY_BROKER_URL = REDIS_URL
    CELERY_RESULT_BACKEND = REDIS_URL
    SESSION_TYPE = 'filesystem'

    # Add SOCKETIO_MESSAGE_QUEUE configuration
    SOCKETIO_MESSAGE_QUEUE = REDIS_URL