import { CONFIG } from './config.js';
import { DebugLogger } from './error.js';
import { Utils } from './utils.js';
import { AuthService } from './auth-service.js';

export const MapService = {
    map: null,
    facilities: [],

    async initMap(elementId = 'map') {
        try {
            // Check if Google Maps API is loaded
            if (typeof google === 'undefined') {
                throw new Error('Google Maps API not loaded');
            }

            const mapElement = document.getElementById(elementId);
            if (!mapElement) {
                throw new Error(`Map element with ID ${elementId} not found`);
            }

            this.map = new google.maps.Map(mapElement, {
                center: { lat: -1.2921, lng: 36.8219 }, // Default to Nairobi
                zoom: 10
            });

            await this.loadHealthFacilities();
        } catch (error) {
            DebugLogger.error('Map Initialization Failed', error);
            Utils.displayError('Could not initialize map');
        }
    },

    async loadHealthFacilities() {
        try {
            const response = await fetch('/data/health_facilities.csv');
            const csvText = await response.text();
            this.facilities = this.parseCSV(csvText);
            this.renderFacilities();
        } catch (error) {
            DebugLogger.error('Facilities Loading Failed', error);
        }
    },

    parseCSV(csvText) {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',');
        return lines.slice(1).map(line => {
            const values = line.split(',');
            return headers.reduce((obj, header, index) => {
                obj[header.trim()] = values[index];
                return obj;
            }, {});
        });
    },

    renderFacilities() {
        this.facilities.forEach(facility => {
            new google.maps.Marker({
                position: {
                    lat: parseFloat(facility.latitude),
                    lng: parseFloat(facility.longitude)
                },
                map: this.map,
                title: facility.name
            });
        });
    },

    async renderNearbyFacilities(lat, lng, radius = 50) {
        const nearbyFacilities = this.facilities.filter(facility => {
            const distance = Utils.calculateDistance(
                lat, lng, 
                parseFloat(facility.latitude), 
                parseFloat(facility.longitude)
            );
            return distance <= radius;
        });

        // Render or list nearby facilities
        const facilityList = document.getElementById('nearby-facilities');
        facilityList.innerHTML = nearbyFacilities.map(facility => `
            <div class="facility-item">
                <h3>${facility.name}</h3>
                <p>Distance: ${this.calculateDistance(lat, lng, facility.latitude, facility.longitude).toFixed(2)} km</p>
            </div>
        `).join('');
    },

    async geocodeAddress(address) {
        try {
            const { lat, lng } = await Utils.geocodeAddress(address);
            this.map.setCenter({ lat, lng });
            this.map.setZoom(15);

            new google.maps.Marker({
                position: { lat, lng },
                map: this.map,
                title: address
            });

            await this.renderNearbyFacilities(lat, lng);
        } catch (error) {
            DebugLogger.error('Geocoding Failed', error);
            Utils.displayError('Could not locate address');
        }
    }
};

document.addEventListener('DOMContentLoaded', function() {
  const mapLoader = document.getElementById('map-loader');
  const mapElement = document.getElementById('kenya-map');

  function showLoader() {
    mapLoader.style.display = 'block';
  }

  function hideLoader() {
    mapLoader.style.display = 'none';
  }

  function loadGoogleMapsError() {
    mapElement.innerHTML = `
      <div class="alert alert-warning">
        <strong>Map Unavailable</strong>
        <p>Unable to load Google Maps. Please try again later.</p>
      </div>
    `;
    hideLoader();
  }

  function initDashboardMap() {
    showLoader();

    // Check if Google Maps API is loaded
    if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
      console.error('Google Maps API not loaded');
      loadGoogleMapsError();
      return;
    }

    // Default location (Nairobi)
    const defaultCenter = { lat: -1.2921, lng: 36.8219 };

    // Try to get user's location, fallback to default
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        createDashboardMap(userLocation);
      },
      (error) => {
        console.warn('Geolocation error:', error);
        createDashboardMap(defaultCenter);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  }

  function createDashboardMap(center) {
    try {
      const mapOptions = {
        center: center,
        zoom: 10,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles: [
          {
            featureType: 'poi.medical',
            elementType: 'labels.icon',
            stylers: [{ visibility: 'on' }]
          }
        ],
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: false
      };

      const map = new google.maps.Map(mapElement, mapOptions);

      // Fetch and process health facilities
      fetch('http://localhost:8000/health-facilities-csv')
        .then(response => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.text();
        })
        .then(csvText => {
          Papa.parse(csvText, {
            header: true,
            complete: function(results) {
              if (!results.data || results.data.length === 0) {
                console.warn('No facilities found in CSV');
                return;
              }

              results.data.forEach(facility => {
                if (facility.latitude && facility.longitude) {
                  const marker = new google.maps.Marker({
                    position: {
                      lat: parseFloat(facility.latitude),
                      lng: parseFloat(facility.longitude)
                    },
                    map: map,
                    title: facility.name,
                    icon: getHealthFacilityMarkerIcon(facility.type)
                  });

                  const infoWindow = new google.maps.InfoWindow({
                    content: createFacilityInfoWindowContent(facility)
                  });

                  marker.addListener('click', () => {
                    infoWindow.open(map, marker);
                  });
                }
              });
            }
          });
        })
        .catch(error => {
          console.error('Error fetching health facilities:', error);
          mapElement.innerHTML = `
            <div class="alert alert-warning">
              <strong>Facilities Unavailable</strong>
              <p>Unable to load health facilities. Please try again later.</p>
            </div>
          `;
        })
        .finally(() => {
          hideLoader();
        });
    } catch (error) {
      console.error('Map initialization error:', error);
      loadGoogleMapsError();
    }
  }

  function getHealthFacilityMarkerIcon(type) {
    const iconBase = './assets/icons/map-markers/';
    const icons = {
      'Hospital': iconBase + 'hospital-marker.png',
      'Clinic': iconBase + 'clinic-marker.png',
      'Health Center': iconBase + 'health-center-marker.png',
      'default': iconBase + 'medical-marker.png'
    };
    return {
      url: icons[type] || icons['default'],
      scaledSize: new google.maps.Size(40, 40)
    };
  }

  function createFacilityInfoWindowContent(facility) {
    return `
      <div class="facility-info-window">
        <h3>${facility.name}</h3>
        <p><strong>Type:</strong> ${facility.type}</p>
        <p><strong>Address:</strong> ${facility.address || 'Not available'}</p>
        <p><strong>Contact:</strong> ${facility.phone || 'Not available'}</p>
        ${facility.rating ? `<p class="facility-rating">Rating: ${facility.rating}/5</p>` : ''}
      </div>
    `;
  }

  // Initialize map on page load
  initDashboardMap();
});