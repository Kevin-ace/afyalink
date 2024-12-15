from flask import Blueprint, jsonify
# Import blueprints
from .auth_routes import auth_bp
from .hospital_routes import hospital_bp

# Create root blueprint
root_bp = Blueprint('root', __name__)

@root_bp.route('/')
def index():
    return jsonify({
        "message": "Welcome to Afyalink API",
        "routes": {
            "authentication": "/auth",
            "hospitals": "/hospitals"
        }
    }), 200
