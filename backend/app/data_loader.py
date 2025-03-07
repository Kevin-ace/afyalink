import os
import sys
import traceback
import logging
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy import UniqueConstraint

# Add the project root directory to the Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)

from app.database import SessionLocal, engine
from app.models import Facility, Insurance, Base, PREDEFINED_INSURANCES

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,  # Change to DEBUG for more detailed logs
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(os.path.dirname(__file__), 'data_loader.log')),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def load_insurances():
    """
    Load predefined insurances into the database
    """
    db = SessionLocal()
    try:
        # Update predefined insurances to match new schema
        updated_insurances = [
            {
                'name': ins['name'],
                'details': ins['coverage_description'],
                'notes': f"Insurance type: {ins['type']}",
                'allowed_facilities': 'All accredited facilities'  # Default value
            }
            for ins in PREDEFINED_INSURANCES
        ]
        
        # Check and add insurances if they don't exist
        for ins_data in updated_insurances:
            existing_insurance = db.query(Insurance).filter_by(name=ins_data['name']).first()
            if not existing_insurance:
                new_insurance = Insurance(**ins_data)
                db.add(new_insurance)
                logger.info(f"Added insurance: {ins_data['name']}")
            else:
                logger.info(f"Insurance already exists: {ins_data['name']}")
        
        db.commit()
        logger.info("Predefined insurances loaded successfully")
    except Exception as e:
        db.rollback()
        logger.error(f"Error loading insurances: {e}")
        logger.error(traceback.format_exc())
    finally:
        db.close()

def load_health_facilities():
    # Drop and recreate tables to ensure latest schema
    try:
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        logger.error(f"Error creating/dropping tables: {e}")
        logger.error(traceback.format_exc())
        return

    # Read the CSV file
    csv_path = os.path.join(os.path.dirname(__file__), 'Health_facilities.csv')
    try:
        df = pd.read_csv(csv_path, encoding='utf-8-sig')
        logger.info(f"CSV file loaded successfully. Total rows: {len(df)}")
    except FileNotFoundError:
        logger.error(f"CSV file not found at {csv_path}")
        return
    except pd.errors.EmptyDataError:
        logger.error("The CSV file is empty")
        return
    except Exception as e:
        logger.error(f"Error reading CSV file: {e}")
        logger.error(traceback.format_exc())
        return

    # Create a database session
    db = SessionLocal()

    # Track statistics
    total_rows = len(df)
    successful_imports = 0
    skipped_rows = 0
    error_rows = 0

    # Load insurances first
    load_insurances()

    # Get all insurances to associate with facilities
    insurances = db.query(Insurance).all()

    try:
        # Iterate through rows and create Facility objects
        for index, row in df.iterrows():
            try:
                # Skip rows with missing critical data
                if (pd.isna(row['Latitude']) or 
                    pd.isna(row['Longitude']) or 
                    pd.isna(row['Facility Name'])):
                    logger.warning(f"Skipping row {index} due to missing critical data")
                    skipped_rows += 1
                    continue

                # Create a new facility
                new_facility = Facility(
                    facility_number=row['Facility Number'],
                    facility_name=row['Facility Name'],
                    hmis=row['HMIS'],
                    province=row['Province'],
                    district=row['District'],
                    division=row['Division'],
                    location=row['LOCATION'],
                    sub_location=row['Sub Location'],
                    spatial_re=row['Spatial_Re'],
                    facility_type=row['Facility Type'],
                    agency=row['Agency'],
                    latitude=row['Latitude'],
                    longitude=row['Longitude'],
                    global_id=row['GlobalID'],
                    x=row['x'],
                    y=row['y']
                )

                # Associate some default insurances (you can modify this logic)
                for insurance in insurances[:3]:  # Associate first 3 insurances as an example
                    new_facility.insurances.append(insurance)

                # Add the facility to the session
                db.add(new_facility)

                # Periodically commit to prevent memory issues
                if (index + 1) % 100 == 0:
                    try:
                        db.commit()
                        logger.info(f"Committed {index + 1} rows")
                    except IntegrityError as ie:
                        db.rollback()
                        logger.error(f"Integrity error on commit at row {index}: {ie}")
                    except SQLAlchemyError as se:
                        db.rollback()
                        logger.error(f"Database error on commit at row {index}: {se}")

                successful_imports += 1

            except SQLAlchemyError as db_error:
                db.rollback()
                logger.error(f"Database error on row {index}: {db_error}")
                logger.error(traceback.format_exc())
                error_rows += 1
            except Exception as e:
                db.rollback()
                logger.error(f"Unexpected error on row {index}: {e}")
                logger.error(traceback.format_exc())
                error_rows += 1

        # Final commit
        try:
            db.commit()
        except IntegrityError as ie:
            db.rollback()
            logger.error(f"Final commit integrity error: {ie}")
        except SQLAlchemyError as se:
            db.rollback()
            logger.error(f"Final commit database error: {se}")

        # Log import statistics
        logger.info(f"Import complete. Total rows: {total_rows}")
        logger.info(f"Successful imports: {successful_imports}")
        logger.info(f"Skipped rows: {skipped_rows}")
        logger.info(f"Error rows: {error_rows}")

    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error during import: {e}")
        logger.error(traceback.format_exc())

    finally:
        db.close()

def add_unique_constraints():
    """
    Add unique constraints to prevent duplicate entries
    """
    try:
        # Add a unique constraint on facility name and location
        UniqueConstraint('name', 'location', name='uq_facility_name_location')
        
        # Recreate tables with new constraints
        Base.metadata.create_all(bind=engine)
        
        logger.info("Unique constraints added successfully")
    except Exception as e:
        logger.error(f"Error adding unique constraints: {e}")
        logger.error(traceback.format_exc())

def load_insurance_data():
    """Load insurance data from CSV file if it exists"""
    try:
        csv_path = os.path.join(os.path.dirname(__file__), 'insuarance.csv')
        if not os.path.exists(csv_path):
            logger.warning(f"Insurance CSV file not found at {csv_path}, skipping...")
            return

        # Read insurance CSV
        df_insurance = pd.read_csv(csv_path)
        
        db = SessionLocal()
        
        # Create insurance records
        for _, row in df_insurance.iterrows():
            insurance_data = {
                'name': row['name of insurance'],
                'details': row['details'],
                'notes': row['notes'],
                'allowed_facilities': row['allowed health facilities']
            }
            
            try:
                # Check if insurance already exists
                existing = db.query(Insurance).filter_by(name=insurance_data['name']).first()
                if not existing:
                    insurance = Insurance(**insurance_data)
                    db.add(insurance)
                    db.commit()
                    logger.info(f"Added insurance: {insurance_data['name']}")
                else:
                    logger.info(f"Insurance already exists: {insurance_data['name']}")
            except Exception as e:
                db.rollback()
                logger.error(f"Error adding insurance {insurance_data['name']}: {str(e)}")
                continue
        
        db.close()
        logger.info("Insurance data loading completed")
        
    except Exception as e:
        logger.error(f"Error loading insurance data: {str(e)}")

def map_facilities_to_insurance():
    """Map facilities to insurance providers based on the allowed facilities text"""
    db = SessionLocal()
    try:
        insurances = db.query(Insurance).all()
        facilities = db.query(Facility).all()
        
        total_facilities = len(facilities)
        mapped_count = 0
        
        logger.info(f"Starting facility-insurance mapping for {total_facilities} facilities")
        
        for facility in facilities:
            facility_mapped = False
            
            # Get facility insurances in a list to avoid repeated queries
            current_insurances = list(facility.insurances)
            
            for insurance in insurances:
                if insurance in current_insurances:
                    continue
                    
                allowed = insurance.allowed_facilities.lower()
                facility_type = facility.facility_type.lower() if facility.facility_type else ""
                
                # Check if facility type matches insurance allowed facilities
                if (
                    ("public" in allowed and "public" in facility_type) or
                    ("private" in allowed and "private" in facility_type) or
                    ("county" in allowed and "county" in facility_type)
                ):
                    facility.insurances.append(insurance)
                    facility_mapped = True
            
            if facility_mapped:
                mapped_count += 1
                if mapped_count % 100 == 0:
                    db.commit()
                    logger.info(f"Mapped {mapped_count}/{total_facilities} facilities")
        
        # Final commit
        db.commit()
        logger.info(f"Completed mapping. Total facilities mapped: {mapped_count}")
            
    except Exception as e:
        logger.error(f"Error mapping facilities to insurance: {str(e)}")
        db.rollback()
    finally:
        db.close()

def load_all_data():
    """Load all data in the correct order"""
    try:
        # Create tables
        Base.metadata.create_all(bind=engine)
        
        # Load predefined insurances first
        load_insurances()
        
        # Load additional insurance data from CSV if available
        load_insurance_data()
        
        # Load facilities data
        load_health_facilities()
        
        # Map facilities to insurance
        map_facilities_to_insurance()
        
        logger.info("Data loading completed successfully")
        return True
        
    except Exception as e:
        logger.error(f"Error in load_all_data: {str(e)}")
        return False

if __name__ == "__main__":
    try:
        # Add unique constraints before loading
        add_unique_constraints()
        
        # Load all data
        success = load_all_data()
        
        if success:
            logger.info("Data loader completed successfully")
            sys.exit(0)
        else:
            logger.error("Data loader failed")
            sys.exit(1)
            
    except KeyboardInterrupt:
        logger.info("Data loading interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        sys.exit(1)