# from flask import Flask
# from .extensions import db, jwt
# from flask_migrate import Migrate

# def create_app():
#     app = Flask(__name__)

#     # Database URI
#     app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://username:password@localhost/afyalink_db'
#     app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

#     # JWT Setup
#     app.config['JWT_SECRET_KEY'] = 'your_jwt_secret_key'  # Change this in production
#     jwt.init_app(app)

#     # Initialize extensions
#     db.init_app(app)
#     migrate.init_app(app, db)

#     return app

# This file can be left empty or used for package initialization
# No need for Flask-specific code since we're using FastAPI

# You can add any package-level imports or configurations here if needed
from . import models, database, routes
