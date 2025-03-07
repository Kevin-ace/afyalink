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

    function createFacilityPopupContent(facility) {
        // Normalize facility data to handle both API and CSV formats
        const facilityData = {
            name: facility.facility_name || facility.name || facility['Facility Name'] || 'N/A',
            type: facility.facility_type || facility.type || facility['Facility Type'] || 'N/A',
            location: facility.location || facility['Location'] || facility.district || facility['District'] || 'N/A',
            insurances: facility.insurances || []
        };

        // Create insurance badges if available
        let insuranceContent = '<em>No insurance information available</em>';
        if (Array.isArray(facilityData.insurances) && facilityData.insurances.length > 0) {
            insuranceContent = facilityData.insurances
                .map(ins => `
                    <div class="insurance-badge" 
                         title="${ins.details || 'No details available'}">
                        ${ins.name}
                    </div>
                `).join('');
        }

        // Build popup content
        const content = `
            <div class="facility-popup">
                <div style="margin-bottom: 15px;">
                    <h5 style="margin: 0 0 10px 0; color: #2c7da0; font-weight: 600;">
                        ${facilityData.name}
                    </h5>
                </div>
                
                <div style="margin-bottom: 10px;">
                    <div style="font-weight: 500;">Type:</div>
                    <div>${facilityData.type}</div>
                </div>
                
                <div style="margin-bottom: 10px;">
                    <div style="font-weight: 500;">Location:</div>
                    <div>${facilityData.location}</div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <div style="font-weight: 500; margin-bottom: 5px;">Accepted Insurance:</div>
                    <div class="insurance-list" style="display: flex; flex-wrap: wrap; gap: 5px;">
                        ${insuranceContent}
                    </div>
                </div>
                
                <button class="btn btn-primary btn-sm" 
                        style="width: 100%; margin-top: 10px;"
                        onclick="showFacilityDetails(${facility.id || facility['Facility Number']})">
                    More Details
                </button>
            </div>
        `;

        return content;
    }

    // Add these helper functions for tooltips
    function showTooltip(event, content) {
        const tooltip = document.createElement('div');
        tooltip.className = 'insurance-tooltip';
        tooltip.textContent = content;
        tooltip.style.left = `${event.pageX + 10}px`;
        tooltip.style.top = `${event.pageY + 10}px`;
        document.body.appendChild(tooltip);
    }

    function hideTooltip() {
        const tooltips = document.querySelectorAll('.insurance-tooltip');
        tooltips.forEach(tooltip => tooltip.remove());
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

                // Create popup with specific options
                const popup = L.popup({
                    maxWidth: 300,
                    minWidth: 280,
                    className: 'facility-popup-wrapper',
                    closeButton: true,
                    autoClose: true,
                    closeOnEscapeKey: true,
                }).setContent(createFacilityPopupContent(facility));

                marker.bindPopup(popup);
                facilitiesLayer.addLayer(marker);
            }
        });

        facilitiesLayer.addTo(map);
        Logger.log(Logger.SUCCESS, 'Facilities added to map');
    }

    function showFacilityDetails(facilityId) {
        // Implement facility details view
        console.log(`Show details for facility ${facilityId}`);
        // You can implement a modal or sidebar view here
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

    // Add insurance filter functionality
    async function loadInsuranceFilters() {
        try {
            const response = await fetch('http://localhost:8000/facilities/insurances');
            const insurances = await response.json();
            
            const filterSelect = document.getElementById('insurance-filter');
            insurances.forEach(insurance => {
                const option = document.createElement('option');
                option.value = insurance.id;
                option.textContent = insurance.name;
                filterSelect.appendChild(option);
            });

            // Add event listener for insurance filter
            filterSelect.addEventListener('change', async () => {
                const selectedInsurance = filterSelect.value;
                const searchTerm = document.getElementById('search-input').value;
                
                // Clear existing markers
                facilitiesLayer.clearLayers();
                
                // Fetch facilities with insurance filter
                const facilities = await fetchFacilities(searchTerm, selectedInsurance);
                addFacilitiesToMap(facilities);
            });
        } catch (error) {
            console.error('Error loading insurance filters:', error);
        }
    }

    // Update facility fetching to include insurance filter
    async function fetchFacilities(searchTerm = '', insuranceId = '') {
        const params = new URLSearchParams({
            name: searchTerm,
            insurance_id: insuranceId
        });

        try {
            const response = await fetch(`http://localhost:8000/facilities?${params}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching facilities:', error);
            return [];
        }
    }

    // Add this function to load insurance details
    async function loadInsuranceDetails() {
        try {
            const response = await fetch('http://localhost:8000/facilities/insurances');
            const insurances = await response.json();
            
            const tableBody = document.getElementById('insurance-table-body');
            tableBody.innerHTML = ''; // Clear existing content
            
            insurances.forEach(insurance => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${insurance.name}</td>
                    <td>${insurance.notes || 'Standard Coverage'}</td>
                    <td>${insurance.details || 'Contact provider for details'}</td>
                    <td>${insurance.allowed_facilities || 'All accredited facilities'}</td>
                `;
                tableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error loading insurance details:', error);
        }
    }

    // Call this function when the page loads
    loadInsuranceDetails();
});