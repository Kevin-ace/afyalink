from app.models import Hospital
from app.extensions import db

def get_hospitals(filters):
    query = Hospital.query
    if 'insurance' in filters:
        query = query.filter(Hospital.insurance.contains(filters['insurance']))
    # Additional filters can go here.
    hospitals = query.all()
    return {'hospitals': [h.to_dict() for h in hospitals]}, 200
