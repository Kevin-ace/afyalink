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
    handleUserLocation();

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
                
                if (facilities && facilities.length > 0) {
                    addFacilitiesToMap(facilities);
                } else {
                    Logger.log(Logger.WARNING, 'No facilities found in API response, falling back to CSV');
                    loadFacilitiesFromCSV(lat, lng, radius);
                }
            } else {
                Logger.log(Logger.WARNING, 'API failed, falling back to CSV');
                loadFacilitiesFromCSV(lat, lng, radius);
            }
        } catch (error) {
            Logger.log(Logger.ERROR, 'Failed to fetch facilities', error);
            loadFacilitiesFromCSV(lat, lng, radius);
        }
    }

    async function loadFacilitiesFromCSV(lat, lng, radius) {
        try {
            const csvResponse = await fetch('http://localhost:8000/health-facilities-csv');
            if (!csvResponse.ok) {
                throw new Error('Failed to fetch CSV data');
            }
            
            const csvText = await csvResponse.text();
            
            Papa.parse(csvText, {
                header: true,
                complete: function(results) {
                    if (!results.data || results.data.length === 0) {
                        Logger.log(Logger.ERROR, 'No data in CSV file');
                        return;
                    }
                    
                    const nearbyFacilities = results.data.filter(facility => {
                        if (!facility.Latitude || !facility.Longitude) return false;
                        
                        // Skip rows with invalid coordinates
                        const facilityLat = parseFloat(facility.Latitude);
                        const facilityLng = parseFloat(facility.Longitude);
                        
                        if (isNaN(facilityLat) || isNaN(facilityLng)) return false;
                        
                        const distance = calculateDistance(
                            lat, lng, 
                            facilityLat, 
                            facilityLng
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
        } catch (error) {
            Logger.log(Logger.ERROR, 'Failed to load facilities from CSV', error);
        }
    }

    function createFacilityPopupContent(facility) {
        const template = document.getElementById('facility-popup-template');
        const content = template.content.cloneNode(true);
        
        // Normalize facility data to handle both API and CSV formats
        const name = facility.facility_name || facility['Facility Name'] || 'N/A';
        const type = facility.facility_type || facility['Facility Type'] || 'Level Not specified';
        const location = facility.location || facility['Location'] || '';
        const district = facility.district || facility['District'] || '';
        
        // Fill in facility information
        content.querySelector('.facility-name').textContent = name;
        content.querySelector('.facility-address').textContent = 
            `${location}${district ? `, ${district}` : ''}`;
        
        // Format facility type to show level
        const levelMatch = type.match(/level\s*(\d+)/i);
        const levelText = levelMatch ? 
            `Level ${levelMatch[1]}` : 
            type.toLowerCase().includes('hospital') ? 'Hospital' : type;
        
        content.querySelector('.facility-type').textContent = levelText;
        
        // Add insurance badges
        const insuranceList = content.querySelector('.insurance-list');
        if (facility.insurances && facility.insurances.length > 0) {
            facility.insurances.forEach(insurance => {
                const badge = document.createElement('div');
                badge.className = 'insurance-badge';
                // Remove "Insurance" from the display name
                badge.textContent = insurance.name.replace(/\s*Insurance\s*/i, '');
                badge.title = insurance.details || 'No details available';
                insuranceList.appendChild(badge);
            });
        } else {
            // Default insurances if none provided
            ['NHIF', 'Private'].forEach(ins => {
                const badge = document.createElement('div');
                badge.className = 'insurance-badge';
                badge.textContent = ins;
                insuranceList.appendChild(badge);
            });
        }
        
        // Add services list
        const servicesList = content.querySelector('.services-list');
        if (facility.services && facility.services.length > 0) {
            facility.services.forEach(service => {
                const badge = document.createElement('div');
                badge.className = 'service-badge';
                badge.textContent = service.name;
                badge.title = service.description || '';
                servicesList.appendChild(badge);
            });
        } else {
            // Default services based on facility type
            const defaultServices = type.toLowerCase().includes('hospital') ? 
                ['Emergency', 'Outpatient', 'Inpatient'] : 
                ['Outpatient', 'Pharmacy'];
            
            defaultServices.forEach(service => {
                const badge = document.createElement('div');
                badge.className = 'service-badge';
                badge.textContent = service;
                servicesList.appendChild(badge);
            });
        }
        
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

    // Add this function to show facility details
    async function showFacilityDetails(facilityId) {
        try {
            const response = await fetch(`http://localhost:8000/facilities/facility/${facilityId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch facility details');
            }
            
            const facility = await response.json();
            
            // Update modal content
            document.getElementById('modal-facility-name').textContent = facility.facility_name;
            document.getElementById('modal-facility-type').textContent = facility.facility_type || 'N/A';
            document.getElementById('modal-facility-agency').textContent = facility.agency || 'N/A';
            document.getElementById('modal-facility-hmis').textContent = facility.hmis || 'N/A';
            document.getElementById('modal-facility-province').textContent = facility.province || 'N/A';
            document.getElementById('modal-facility-district').textContent = facility.district || 'N/A';
            document.getElementById('modal-facility-division').textContent = facility.division || 'N/A';
            document.getElementById('modal-facility-location').textContent = facility.location || 'N/A';
            document.getElementById('modal-facility-sublocation').textContent = facility.sub_location || 'N/A';
            
            // Update insurance list
            const insuranceList = document.getElementById('modal-facility-insurance');
            insuranceList.innerHTML = '';
            if (facility.insurances && facility.insurances.length > 0) {
                facility.insurances.forEach(insurance => {
                    const badge = document.createElement('div');
                    badge.className = 'insurance-badge';
                    badge.textContent = insurance.name;
                    badge.title = insurance.details;
                    insuranceList.appendChild(badge);
                });
            } else {
                insuranceList.innerHTML = '<em>No insurance information available</em>';
            }
            
            // Show the modal
            const modal = new bootstrap.Modal(document.getElementById('facilityDetailsModal'));
            modal.show();
            
        } catch (error) {
            console.error('Error fetching facility details:', error);
            alert('Failed to load facility details');
        }
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

    // Update the loadInsuranceDetails function with CSV fallback
    async function loadInsuranceDetails() {
        try {
            // Try to fetch from API first
            const response = await fetch('http://localhost:8000/facilities/insurances');
            
            if (!response.ok) {
                throw new Error(`API returned status: ${response.status}`);
            }
            
            const insurances = await response.json();
            populateInsuranceTable(insurances);
            
        } catch (error) {
            console.error('Error loading insurance data from API:', error);
            console.log('Falling back to CSV data...');
            
            // Fallback to CSV file
            try {
                const csvResponse = await fetch('../data/insuarance.csv');
                if (!csvResponse.ok) {
                    throw new Error(`CSV fetch failed with status: ${csvResponse.status}`);
                }
                
                const csvText = await csvResponse.text();
                
                // Parse CSV using PapaParse
                Papa.parse(csvText, {
                    header: true,
                    complete: function(results) {
                        // Transform CSV data to match API format
                        const insurances = results.data.map((item, index) => ({
                            id: index + 1,
                            name: item['name of insurance'] || 'Unknown',
                            details: item['details'] || 'No details available',
                            notes: item['notes'] || '',
                            allowed_facilities: item['allowed health facilities'] || 'Contact provider'
                        }));
                        
                        populateInsuranceTable(insurances);
                    },
                    error: function(error) {
                        console.error('CSV parsing failed:', error);
                        showTableError();
                    }
                });
                
            } catch (csvError) {
                console.error('Error loading CSV fallback:', csvError);
                showTableError();
            }
        }
    }

    // Update the insurance table population
    function populateInsuranceTable(insurances) {
        const tableBody = document.getElementById('insurance-table-body');
        tableBody.innerHTML = '';
        
        if (!insurances || insurances.length === 0) {
            showTableError('No insurance data available');
            return;
        }
        
        insurances.forEach(insurance => {
            const type = insurance.notes?.match(/Insurance type: (.+)/)?.[1] || 'Standard';
            const typeClass = type.toLowerCase() === 'public' ? 'public' : 'private';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div class="insurance-name">${insurance.name}</div>
                    <div class="insurance-type ${typeClass}">${type}</div>
                </td>
                <td>${insurance.details || 'Contact provider for details'}</td>
                <td>${insurance.allowed_facilities || 'All accredited facilities'}</td>
            `;
            tableBody.appendChild(row);
        });
    }

    // Helper function to show error in the table
    function showTableError(message = 'Error loading insurance data. Please try again later.') {
        const tableBody = document.getElementById('insurance-table-body');
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted">
                    <i>${message}</i>
                </td>
            </tr>
        `;
    }

    // Add function to get directions
    function getDirections() {
        const facilityName = document.getElementById('modal-facility-name').textContent;
        const location = document.getElementById('modal-facility-location').textContent;
        const searchQuery = encodeURIComponent(`${facilityName}, ${location}, Kenya`);
        window.open(`https://www.google.com/maps/search/?api=1&query=${searchQuery}`, '_blank');
    }

    // Call this function when the page loads
    loadInsuranceDetails();

    // Update the user location handling
    function handleUserLocation() {
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

                    // Create custom popup for user location
                    const userPopup = L.popup({
                        className: 'user-location-popup',
                        closeButton: false,
                        offset: [0, -10]
                    }).setContent('<h5>You are here</h5>');

                    userMarker.bindPopup(userPopup).openPopup();

                    // Center map on user location and fetch nearby facilities
                    map.setView(userLocation, defaultZoom);
                    fetchNearbyFacilities(userLocation[0], userLocation[1], searchRadius);
                },
                (error) => {
                    Logger.log(Logger.WARNING, 'Geolocation error:', error);
                    alert('Unable to get your location. Using default location.');
                    useDefaultLocation();
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        } else {
            Logger.log(Logger.WARNING, 'Geolocation not available');
            useDefaultLocation();
        }
    }

    function useDefaultLocation() {
        const defaultLocation = [-1.286389, 36.817223]; // Nairobi coordinates
        map.setView(defaultLocation, defaultZoom);
        fetchNearbyFacilities(defaultLocation[0], defaultLocation[1], searchRadius);
    }

    // Call handleUserLocation when the map is ready
    handleUserLocation();
});