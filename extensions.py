# extensions.py

from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from authlib.integrations.flask_client import OAuth
from flask_socketio import SocketIO
from celery import Celery

db = SQLAlchemy()
migrate = Migrate()
oauth = OAuth()

# Initialize Socket.IO with message queue
socketio = SocketIO(cors_allowed_origins="*", message_queue=None)

def make_celery(app):
    celery = Celery(
        app.import_name,
        broker=app.config['CELERY_BROKER_URL'],
        backend=app.config['CELERY_RESULT_BACKEND'],
    )
    celery.conf.update(app.config)

    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery.Task = ContextTask
    return celery