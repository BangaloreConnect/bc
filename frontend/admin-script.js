// Admin Panel Script
let adminJobs = JSON.parse(localStorage.getItem('jobs')) || [];
let adminUser = JSON.parse(localStorage.getItem('adminUser'));
let sessionTimer = 180;
let timerInterval = null;

// Check admin authentication
if (!adminUser || adminUser.role !== 'admin') {
    window.location.href = 'index.html';
}

// DOM Elements
const adminLogoutBtn = document.getElementById('adminLogoutBtn');
const adminTabs = document.querySelectorAll('.admin-tab');
const tabContents = document.querySelectorAll('.tab-content');
const adminJobForm = document.getElementById('adminJobForm');
const sessionTimerElement = document.getElementById('sessionTimer');

// Sample Job Data for initialization
const sampleJobs = [
    {
        id: '1',
        title: 'Senior Software Engineer',
        company: 'Tech Mahindra',
        location: 'Whitefield',
        salary: '₹18-25 LPA',
        type: 'Full-time',
        experience: '5+ years',
        description: `We are looking for a Senior Software Engineer with expertise in Java and Spring Boot.

Responsibilities:
• Design and develop high-volume, low-latency applications
• Write well-designed, testable, efficient code
• Ensure designs follow specifications
• Prepare and produce releases of software components
• Support continuous improvement

Requirements:
• Bachelor's degree in Computer Science or related field
• 5+ years of Java development experience
• Strong knowledge of Spring Boot, Microservices
• Experience with REST APIs, SQL databases
• Excellent problem-solving skills

Benefits:
• Health insurance
• Flexible working hours
• Annual bonus
• Learning and development opportunities`,
        requirements: ['5+ years Java experience', 'Spring Boot expertise', 'Microservices architecture', 'REST API design'],
        benefits: ['Health insurance', 'Flexible hours', 'Annual bonus', 'Learning budget'],
        applicants: 24,
        createdAt: new Date().toISOString(),
        status: 'active',
        postedBy: 'admin',
        applyLink: 'https://techmahindra.com/careers'
    },
    {
        id: '2',
        title: 'Frontend Developer (React)',
        company: 'Infosys',
        location: 'Electronic City',
        salary: '₹10-15 LPA',
        type: 'Full-time',
        experience: '2-4 years',
        description: `Join our frontend team to build amazing user interfaces with React.

Key Responsibilities:
• Develop new user-facing features using React.js
• Build reusable components and front-end libraries
• Translate designs and wireframes into high-quality code
• Optimize components for maximum performance
• Collaborate with UX/UI designers

Technical Requirements:
• Strong proficiency in JavaScript, including DOM manipulation
• Thorough understanding of React.js and its core principles
• Experience with popular React workflows (Redux)
• Familiarity with newer specifications of ECMAScript

Perks:
• Remote work options
• Competitive salary
• Skill development programs
• Great work culture`,
        requirements: ['2+ years React experience', 'JavaScript ES6+', 'Redux/Context API', 'HTML5/CSS3'],
        benefits: ['Remote work', 'Competitive salary', 'Skill development', 'Great culture'],
        applicants: 18,
        createdAt: new Date().toISOString(),
        status: 'active',
        postedBy: 'admin',
        applyLink: 'https://infosys.com/careers'
    }
];

// Initialize admin data
function initializeAdminData() {
    if (!localStorage.getItem('jobs')) {
        localStorage.setItem('jobs', JSON.stringify(sampleJobs));
        adminJobs = sampleJobs;
    } else {
        adminJobs = JSON.parse(localStorage.getItem('jobs'));
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    initializeAdminData();
    loadAdminStats();
    loadJobsForAdmin();
    setupAdminEventListeners();
    startSessionTimer();
    
    // Check URL hash for tab
    const hash = window.location.hash.substring(1);
    if (hash) {
        switchTab(hash);
    }
});

function setupAdminEventListeners() {
    // Tabs
    adminTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            switchTab(tabId);
            window.location.hash = tabId;
        });
    });

    // Logout
    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener('click', handleAdminLogout);
    }

    // Job Form
    if (adminJobForm) {
        adminJobForm.addEventListener('submit', handlePostJob);
    }

    // User activity tracking
    document.addEventListener('mousemove', resetSessionTimer);
    document.addEventListener('keypress', resetSessionTimer);
    document.addEventListener('click', resetSessionTimer);
}

function switchTab(tabId) {
    adminTabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    
    const activeTab = document.querySelector(`[data-tab="${tabId}"]`);
    const activeContent = document.getElementById(`${tabId}Tab`);
    
    if (activeTab) activeTab.classList.add('active');
    if (activeContent) activeContent.classList.add('active');
}

function startSessionTimer() {
    if (!sessionTimerElement) return;
    
    timerInterval = setInterval(() => {
        sessionTimer--;
        sessionTimerElement.textContent = `Session expires in: ${sessionTimer}s`;
        
        if (sessionTimer <= 0) {
            handleAdminLogout();
        }
    }, 1000);
}

function resetSessionTimer() {
    sessionTimer = 180;
    if (sessionTimerElement) {
        sessionTimerElement.textContent = `Session expires in: ${sessionTimer}s`;
    }
}

// Fix logout function
function handleAdminLogout() {
    localStorage.removeItem('adminUser');
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    window.location.href = 'index.html';
}

// Update loadAdminStats to show correct counts
function loadAdminStats() {
    const totalJobs = adminJobs.length;
    const activeJobs = adminJobs.filter(job => job.status === 'active').length;
    
    const totalJobsElement = document.getElementById('totalJobs');
    const activeJobsElement = document.getElementById('activeJobs');
    
    if (totalJobsElement) totalJobsElement.textContent = totalJobs;
    if (activeJobsElement) activeJobsElement.textContent = activeJobs;
}

function loadJobsForAdmin() {
    const tbody = document.getElementById('jobsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = adminJobs.map(job => `
        <tr>
            <td><strong>${job.title}</strong></td>
            <td>${job.company}</td>
            <td>${job.location}</td>
            <td>${job.salary}</td>
            <td>${job.applicants || 0}</td>
            <td>
                <span class="status status-${job.status === 'active' ? 'active' : 'inactive'}">
                    ${job.status}
                </span>
            </td>
            <td class="action-buttons">
                <button class="action-btn btn-toggle" onclick="toggleJobStatus('${job.id}')">
                    ${job.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
                <button class="action-btn btn-delete" onclick="deleteJob('${job.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        </tr>
    `).join('');
}

// Make functions global
window.toggleJobStatus = function(jobId) {
    const jobIndex = adminJobs.findIndex(j => j.id === jobId);
    if (jobIndex !== -1) {
        adminJobs[jobIndex].status = adminJobs[jobIndex].status === 'active' ? 'inactive' : 'active';
        localStorage.setItem('jobs', JSON.stringify(adminJobs));
        loadJobsForAdmin();
        loadAdminStats();
        showNotification('Job status updated successfully', 'success');
    }
}

window.deleteJob = function(jobId) {
    if (confirm('Are you sure you want to delete this job?')) {
        // Get all jobs from localStorage
        let allJobs = JSON.parse(localStorage.getItem('jobs')) || [];
        
        // Remove the job
        allJobs = allJobs.filter(j => j.id !== jobId);
        
        // Save back to localStorage
        localStorage.setItem('jobs', JSON.stringify(allJobs));
        
        // Update local array
        adminJobs = allJobs;
        
        loadJobsForAdmin();
        loadAdminStats();
        showNotification('Job deleted successfully', 'success');
    }
}

// Update job posting function
function handlePostJob(e) {
    e.preventDefault();
    
    const applyLinkInput = document.getElementById('jobApplyLink');
    const applyLink = applyLinkInput ? applyLinkInput.value.trim() : '';
    
    const newJob = {
        id: Date.now().toString(),
        title: document.getElementById('jobTitle').value.trim(),
        company: document.getElementById('jobCompany').value.trim(),
        location: document.getElementById('jobLocation').value,
        salary: document.getElementById('jobSalary').value.trim(),
        type: document.getElementById('jobType').value,
        experience: document.getElementById('jobExperience').value,
        description: document.getElementById('jobDescription').value,
        applyLink: applyLink || '', // Add apply link
        requirements: document.getElementById('jobRequirements').value.split('\n').filter(line => line.trim()),
        benefits: document.getElementById('jobBenefits').value.split('\n').filter(line => line.trim()),
        applicants: 0,
        createdAt: new Date().toISOString(),
        status: 'active',
        postedBy: adminUser.username
    };
    
    // Validate required fields
    if (!newJob.title || !newJob.company || !newJob.location || !newJob.salary || !newJob.type || !newJob.experience || !newJob.description) {
        showNotification('Please fill all required fields', 'error');
        return;
    }
    
    // Validate URL if provided
    if (newJob.applyLink && !isValidUrl(newJob.applyLink)) {
        showNotification('Please enter a valid URL for apply link', 'error');
        return;
    }
    
    // Get existing jobs
    let existingJobs = JSON.parse(localStorage.getItem('jobs')) || [];
    
    // Add new job at the beginning
    existingJobs.unshift(newJob);
    
    // Save to localStorage
    localStorage.setItem('jobs', JSON.stringify(existingJobs));
    
    // Update local array
    adminJobs = existingJobs;
    
    showNotification('Job posted successfully!', 'success');
    adminJobForm.reset();
    
    // Switch to jobs tab and refresh
    switchTab('jobs');
    loadJobsForAdmin();
    loadAdminStats();
}

// Add URL validation function
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

function showNotification(message, type = 'info') {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">&times;</button>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 12px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 3000;
        animation: slideIn 0.3s ease;
    `;
    
    // Set background color based on type
    const bgColors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#2E8B57'
    };
    notification.style.background = bgColors[type] || '#2E8B57';
    notification.style.color = type === 'warning' ? '#212529' : 'white';
    
    document.body.appendChild(notification);
    
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.remove();
    });
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Add notification styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    .notification-content { display: flex; align-items: center; gap: 10px; }
    .notification-close {
        background: none; border: none; color: inherit; font-size: 20px;
        cursor: pointer; padding: 0; margin-left: 10px;
    }
`;
document.head.appendChild(style);