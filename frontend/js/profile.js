function updateProfileDisplay(userData) {
    const placeholders = {
        name: 'Name will appear here',
        email: 'email@example.com',
        phone: 'Phone number will appear here',
        idNumber: 'ID number will appear here',
        emergency: 'Emergency contact will appear here',
        insurance: 'Insurance details will appear here',
        sha: 'SHA details will appear here'
    };

    try {
        // Update profile information with fallbacks to placeholders
        document.getElementById('profileName').textContent = 
            userData ? `${userData.first_name} ${userData.last_name}` : placeholders.name;
        document.getElementById('profileEmail').textContent = 
            userData?.email || placeholders.email;
        document.getElementById('profilePhone').textContent = 
            userData?.phone_number || placeholders.phone;
        document.getElementById('idNumber').textContent = 
            userData?.id_number || placeholders.idNumber;
        document.getElementById('emergencyContact').textContent = 
            userData?.emergency_contact || placeholders.emergency;
        document.getElementById('insuranceDetails').textContent = 
            userData?.insurance_details || placeholders.insurance;
        document.getElementById('shaDetails').textContent = 
            userData?.sha_details || placeholders.sha;
        
        // Update avatars
        const avatarUrls = document.querySelectorAll('#userAvatar, #profileAvatar');
        avatarUrls.forEach(img => {
            img.src = userData?.avatar_url || '../assets/icons/medical-symbol.png';
            img.onerror = function() {
                this.src = '../assets/icons/medical-symbol.png';
            };
        });

        // Add visual indication for placeholder data
        if (!userData) {
            document.querySelectorAll('.text-muted').forEach(el => {
                el.classList.add('placeholder-text');
            });
        }

    } catch (error) {
        console.error('Error updating profile display:', error);
        // Fallback to placeholders on error
        updateProfileDisplay(null);
    }
}

function updateMedicalHistory(history) {
    const tableBody = document.getElementById('medicalHistoryTable');
    if (!history || history.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted">
                    <i class="fas fa-info-circle me-2"></i>
                    No medical history available yet
                </td>
            </tr>
        `;
        return;
    }
    
    // Rest of the medical history update logic...
} 