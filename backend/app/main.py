import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))


from app import create_app
from app.extensions import db
from flask_migrate import Migrate

app = create_app()
migrate = Migrate(app, db)

if __name__ == '__main__':
    app.run(debug=True)


