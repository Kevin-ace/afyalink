from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Table, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

# Association tables for many-to-many relationships
facility_service_association = Table(
    'facility_service', Base.metadata,
    Column('facility_id', Integer, ForeignKey('facilities.id')),
    Column('service_id', Integer, ForeignKey('services.id'))
)

facility_insurance_association = Table(
    'facility_insurance', Base.metadata,
    Column('facility_id', Integer, ForeignKey('facilities.id')),
    Column('insurance_id', Integer, ForeignKey('insurances.id'))
)

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    is_active = Column(Boolean, default=True)
    
    # New fields
    first_name = Column(String)
    last_name = Column(String)
    id_number = Column(String, unique=True)
    emergency_contact = Column(String)
    insurance_details = Column(String, nullable=True)
    sha_details = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Optional relationship with Insurance if needed
    insurance_id = Column(Integer, ForeignKey('insurances.id'), nullable=True)
    insurance = relationship('Insurance', backref='users')

class Facility(Base):
    __tablename__ = 'facilities'
    
    id = Column(Integer, primary_key=True, index=True)
    facility_number = Column(Integer, nullable=False)
    facility_name = Column(String, nullable=False)
    hmis = Column(Integer)
    province = Column(String)
    district = Column(String)
    division = Column(String)
    location = Column(String)
    sub_location = Column(String)
    spatial_re = Column(String)
    facility_type = Column(String)
    agency = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    global_id = Column(String)
    x = Column(Float)
    y = Column(Float)
    
    # Relationships
    services = relationship(
        'Service', 
        secondary=facility_service_association, 
        back_populates='facilities'
    )
    insurances = relationship(
        'Insurance', 
        secondary=facility_insurance_association, 
        back_populates='facilities'
    )

    def __repr__(self):
        return f"<Facility(id={self.id}, name='{self.facility_name}', location=({self.latitude}, {self.longitude}))>"

class Service(Base):
    __tablename__ = 'services'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    description = Column(String)
    
    # Relationship back to facilities
    facilities = relationship(
        'Facility', 
        secondary=facility_service_association, 
        back_populates='services'
    )

class Insurance(Base):
    __tablename__ = 'insurances'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    type = Column(String)  # Public or Private
    coverage_description = Column(Text)
    
    # Many-to-many relationship with facilities
    facilities = relationship(
        'Facility', 
        secondary=facility_insurance_association, 
        back_populates='insurances'
    )

# Predefined Insurances
PREDEFINED_INSURANCES = [
    {
        'name': 'National Hospital Insurance Fund (NHIF)',
        'type': 'Public',
        'coverage_description': 'All government hospitals (fully covered for in-patient services). Select private hospitals (fully or partially covered). Accredited mission and faith-based facilities. Outpatient services in accredited clinics.'
    },
    {
        'name': 'Jubilee Health Insurance',
        'type': 'Private',
        'coverage_description': 'Inpatient and outpatient services. Wellness and maternity packages. Partnered with leading private and public facilities.'
    },
    {
        'name': 'AAR Insurance',
        'type': 'Private',
        'coverage_description': 'AAR clinics for outpatient services. Partnerships with private hospitals for inpatient services.'
    },
    {
        'name': 'CIC Group',
        'type': 'Private',
        'coverage_description': 'Both private and public hospitals. Inpatient and outpatient services.'
    },
    {
        'name': 'Britam Health Insurance',
        'type': 'Private',
        'coverage_description': 'Wellness, maternity, and chronic condition management. Offers flexible plans for individuals and corporates.'
    },
    {
        'name': 'Resolution Health Insurance',
        'type': 'Private',
        'coverage_description': 'Comprehensive health packages for corporates and individuals.'
    },
    {
        'name': 'UAP Old Mutual Health Insurance',
        'type': 'Private',
        'coverage_description': 'Coverage for inpatient and outpatient, maternity, and chronic conditions.'
    },
    {
        'name': 'APA Apollo Health Insurance',
        'type': 'Private',
        'coverage_description': 'Health insurance plans for individuals, families, and groups.'
    },
    {
        'name': 'Sanlam Health Insurance',
        'type': 'Private',
        'coverage_description': 'Offers comprehensive healthcare services, including dental and optical.'
    },
    {
        'name': 'Minet Kenya Insurance',
        'type': 'Group',
        'coverage_description': 'Accredited public and private hospitals for teaching staff.'
    }
]
