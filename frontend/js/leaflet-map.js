import { Logger } from './services/logger.js';

// Wait for the page to load
document.addEventListener("DOMContentLoaded", function () {
    // Make sure we have a map container in the HTML
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        Logger.log(Logger.ERROR, 'Map container not found');
        return;
    }

    const defaultCenter = [-1.286389, 36.817223]; // Nairobi coordinates
    const defaultZoom = 12;
    const searchRadius = 20; // 20km radius
    let userMarker = null;
    let facilitiesLayer = L.layerGroup();

    // Initialize map with specific height
    mapContainer.style.height = '500px'; // Set explicit height
    const map = L.map('map').setView(defaultCenter, defaultZoom);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Force a map refresh
    setTimeout(() => {
        map.invalidateSize();
    }, 100);

    // Get user's location with error handling
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLocation = [position.coords.latitude, position.coords.longitude];
                Logger.log(Logger.SUCCESS, 'Got user location', userLocation);
                
                // Clear previous user marker if exists
                if (userMarker) {
                    map.removeLayer(userMarker);
                }

                // Add user marker with custom icon
                userMarker = L.marker(userLocation, {
                    icon: L.divIcon({
                        className: 'custom-marker user-location',
                        html: '<i class="fas fa-user-circle"></i>',
                        iconSize: [30, 30],
                        iconAnchor: [15, 15]
                    }),
                    zIndexOffset: 1000
                }).addTo(map);

                // Set view to user location and show popup
                map.setView(userLocation, defaultZoom);
                userMarker.bindPopup('Your Location').openPopup();

                // Fetch nearby facilities
                fetchNearbyFacilities(userLocation[0], userLocation[1], searchRadius);
            },
            (error) => {
                Logger.log(Logger.WARNING, 'Geolocation error, using default location', error);
                fetchNearbyFacilities(defaultCenter[0], defaultCenter[1], searchRadius);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    } else {
        Logger.log(Logger.WARNING, 'Geolocation not available');
        fetchNearbyFacilities(defaultCenter[0], defaultCenter[1], searchRadius);
    }

    async function fetchNearbyFacilities(lat, lng, radius) {
        try {
            Logger.log(Logger.INFO, 'Fetching nearby facilities', { lat, lng, radius });
            facilitiesLayer.clearLayers();

            const response = await fetch(
                `http://localhost:8000/facilities/nearby?latitude=${lat}&longitude=${lng}&radius=${radius}`
            );

            if (response.ok) {
                const facilities = await response.json();
                Logger.log(Logger.SUCCESS, 'Facilities fetched successfully', { count: facilities.length });
                addFacilitiesToMap(facilities);
            } else {
                Logger.log(Logger.WARNING, 'API failed, falling back to CSV');
                const csvResponse = await fetch('http://localhost:8000/health-facilities-csv');
                const csvText = await csvResponse.text();
                
                Papa.parse(csvText, {
                    header: true,
                    complete: function(results) {
                        const nearbyFacilities = results.data.filter(facility => {
                            if (!facility.Latitude || !facility.Longitude) return false;
                            
                            const distance = calculateDistance(
                                lat, lng, 
                                parseFloat(facility.Latitude), 
                                parseFloat(facility.Longitude)
                            );
                            return distance <= radius;
                        });
                        
                        Logger.log(Logger.SUCCESS, 'Facilities loaded from CSV', { count: nearbyFacilities.length });
                        addFacilitiesToMap(nearbyFacilities);
                    },
                    error: function(error) {
                        Logger.log(Logger.ERROR, 'CSV parsing failed', error);
                    }
                });
            }
        } catch (error) {
            Logger.log(Logger.ERROR, 'Failed to fetch facilities', error);
        }
    }

    function addFacilitiesToMap(facilities) {
        Logger.log(Logger.INFO, 'Adding facilities to map', { count: facilities.length });
        
        facilities.forEach(facility => {
            const facilityLat = facility.latitude || facility.Latitude;
            const facilityLng = facility.longitude || facility.Longitude;
            
            if (facilityLat && facilityLng) {
                const marker = L.marker([facilityLat, facilityLng], {
                    icon: L.divIcon({
                        className: 'custom-marker facility-location',
                        html: '<i class="fas fa-hospital"></i>',
                        iconSize: [30, 30],
                        iconAnchor: [15, 15]
                    })
                });

                marker.bindPopup(createFacilityPopupContent(facility));
                facilitiesLayer.addLayer(marker);
            }
        });

        facilitiesLayer.addTo(map);
        Logger.log(Logger.SUCCESS, 'Facilities added to map');
    }

    function createFacilityPopupContent(facility) {
        return `
            <div class="facility-popup">
                <h4>${facility.facility_name || facility.name || facility['Facility Name']}</h4>
                <p><strong>Type:</strong> ${facility.facility_type || facility.type || facility['Facility Type'] || 'N/A'}</p>
                <p><strong>Location:</strong> ${facility.location || facility['LOCATION'] || 'N/A'}</p>
                <p><strong>District:</strong> ${facility.district || facility['District'] || 'N/A'}</p>
                <button class="btn btn-primary btn-sm" onclick="window.location.href='booking.html?facility=${facility.id || facility['Facility Number']}'">
                    Book Appointment
                </button>
            </div>
        `;
    }

    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radius of the earth in km
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        return R * c;
    }

    function deg2rad(deg) {
        return deg * (Math.PI/180);
    }
});