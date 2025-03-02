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
        # Check and add insurances if they don't exist
        for ins_data in PREDEFINED_INSURANCES:
            existing_insurance = db.query(Insurance).filter_by(name=ins_data['name']).first()
            if not existing_insurance:
                new_insurance = Insurance(
                    name=ins_data['name'],
                    type=ins_data['type'],
                    coverage_description=ins_data['coverage_description']
                )
                db.add(new_insurance)
        
        db.commit()
        logger.info("Insurances loaded successfully")
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

if __name__ == "__main__":
    # Optional: Add unique constraints before loading
    add_unique_constraints()
    
    # Load facilities
    load_health_facilities()