# celery_worker.py

from app import create_app
from extensions import make_celery

app = create_app()
celery = make_celery(app)

if __name__ == '__main__':
    celery.worker_main(['worker', '--loglevel=info'])