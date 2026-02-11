// ============================================
// API CONFIGURATION - AUTO-DETECTS ENVIRONMENT
// ============================================
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : '/api';

console.log('API Base URL:', API_BASE_URL);

// ============================================
// STATE MANAGEMENT
// ============================================
let currentUser = JSON.parse(localStorage.getItem('adminUser')) || null;
let allJobs = [];
let currentJobPage = 1;
const jobsPerPage = 8;
let adminInactivityTimer = null;
const ADMIN_TIMEOUT = 30000; // 30 seconds

// ============================================
// DOM ELEMENTS
// ============================================
const adminLoginBtn = document.getElementById('adminLoginBtn');
const postJobBtn = document.getElementById('postJobBtn');
const menuToggle = document.getElementById('menuToggle');
const navMenu = document.getElementById('navMenu');
const adminLoginModal = document.getElementById('adminLoginModal');
const adminLoginForm = document.getElementById('adminLoginForm');

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Bangalore Connect frontend loaded');
    updateAuthUI();
    loadJobs();
    setupEventListeners();
    startAdminInactivityTimer();
    setupAdminFeatures();
    testAPIConnection();
});

// Test API connection
async function testAPIConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();
        console.log('✅ API Connection successful:', data);
    } catch (error) {
        console.error('❌ API Connection failed:', error);
        showNotification('Backend server not responding. Please try again later.', 'error');
    }
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
    // Admin login button
    if (adminLoginBtn) {
        adminLoginBtn.addEventListener('click', () => showModal(adminLoginModal));
    }
    
    // Post job button
    if (postJobBtn) {
        postJobBtn.addEventListener('click', handlePostJobClick);
    }
    
    // Mobile menu toggle
    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => navMenu.classList.toggle('active'));
    }

    // Modal close buttons
    const closeAdminLoginBtn = document.getElementById('closeAdminLogin');
    if (closeAdminLoginBtn) {
        closeAdminLoginBtn.addEventListener('click', () => hideModal(adminLoginModal));
    }

    // Admin login form
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', handleAdminLogin);
    }

    // Filter buttons
    const applyFiltersBtn = document.getElementById('applyFilters');
    const resetFiltersBtn = document.getElementById('resetFilters');
    if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', applyAllFilters);
    if (resetFiltersBtn) resetFiltersBtn.addEventListener('click', resetAllFilters);

    // Load more button
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) loadMoreBtn.addEventListener('click', loadMoreJobs);

    // Password toggle
    const toggleAdminPasswordBtn = document.getElementById('toggleAdminPassword');
    if (toggleAdminPasswordBtn) {
        toggleAdminPasswordBtn.addEventListener('click', toggleAdminPassword);
    }

    // User activity tracking for admin session
    document.addEventListener('mousemove', resetAdminInactivityTimer);
    document.addEventListener('keypress', resetAdminInactivityTimer);
    document.addEventListener('click', resetAdminInactivityTimer);

    // Navigation smooth scroll
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
                if (navMenu) navMenu.classList.remove('active');
            }
        });
    });

    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target === adminLoginModal) hideModal(adminLoginModal);
    });
}

// ============================================
// JOB LOADING AND DISPLAY
// ============================================
async function loadJobs() {
    try {
        console.log('Loading jobs from API...');
        const response = await fetch(`${API_BASE_URL}/jobs`);
        const data = await response.json();
        
        if (data.success) {
            allJobs = data.jobs;
            console.log(`✅ Loaded ${allJobs.length} jobs`);
        } else {
            throw new Error('Failed to load jobs');
        }
    } catch (error) {
        console.error('Error loading jobs from API, using localStorage:', error);
        // Fallback to localStorage
        const storedJobs = localStorage.getItem('jobs');
        if (storedJobs) {
            allJobs = JSON.parse(storedJobs).filter(job => job.status === 'active');
        } else {
            allJobs = [];
        }
    }
    
    displayJobs(allJobs.slice(0, currentJobPage * jobsPerPage));
    updateJobCount();
}

function displayJobs(jobs) {
    const jobList = document.getElementById('jobList');
    const noJobsMessage = document.getElementById('noJobsMessage');
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    
    if (!jobList) return;
    
    if (jobs.length === 0) {
        jobList.innerHTML = '';
        if (noJobsMessage) noJobsMessage.style.display = 'block';
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        return;
    }
    
    if (noJobsMessage) noJobsMessage.style.display = 'none';
    if (loadMoreBtn) loadMoreBtn.style.display = 'block';
    
    if (currentJobPage === 1) {
        jobList.innerHTML = '';
    }
    
    jobs.forEach(job => {
        const jobCard = document.createElement('div');
        jobCard.className = 'job-card-vertical';
        jobCard.setAttribute('data-id', job.id);
        
        const postedDate = formatPostedDate(job.createdAt);
        
        jobCard.innerHTML = `
            <div class="job-header-vertical">
                <div>
                    <h3 class="job-title-vertical">${escapeHTML(job.title)}</h3>
                    <p class="job-company-vertical">
                        <i class="fas fa-building"></i> ${escapeHTML(job.company)}
                    </p>
                </div>
                <div class="job-salary-vertical">${escapeHTML(job.salary)}</div>
            </div>
            
            <div class="job-meta-vertical">
                <span class="job-meta-item-vertical">
                    <i class="fas fa-map-marker-alt"></i> ${escapeHTML(job.location)}
                </span>
                <span class="job-meta-item-vertical">
                    <i class="fas fa-clock"></i> ${escapeHTML(job.type)}
                </span>
                <span class="job-meta-item-vertical">
                    <i class="fas fa-chart-line"></i> ${escapeHTML(job.experience)}
                </span>
            </div>
            
            <p class="job-description-vertical">
                ${escapeHTML(job.description.substring(0, 200))}...
            </p>
            
            <div class="job-footer-vertical">
                <div class="job-applicants-vertical">
                    <i class="fas fa-calendar-alt"></i> 
                    <span>Posted: ${postedDate}</span>
                </div>
                <div>
                    ${job.applyLink ? `
                    <a href="${job.applyLink}" 
                       target="_blank" 
                       rel="noopener noreferrer" 
                       class="btn btn-success" 
                       style="margin-right: 10px; background: linear-gradient(135deg, #28a745, #20c997); color: white; border: none; display: inline-flex; align-items: center; gap: 5px; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-weight: 500;">
                        <i class="fas fa-paper-plane"></i> Apply
                    </a>
                    ` : ''}
                    <button class="btn btn-outline btn-share-job" data-id="${job.id}" style="margin-right: 10px;">
                        <i class="fas fa-share-alt"></i> Share
                    </button>
                    <button class="btn btn-primary btn-view-job" data-id="${job.id}">
                        <i class="fas fa-eye"></i> Details
                    </button>
                </div>
            </div>
        `;
        
        jobList.appendChild(jobCard);
    });
    
    // Add event listeners
    setTimeout(() => {
        document.querySelectorAll('.job-card-vertical').forEach(card => {
            card.style.cursor = 'pointer';
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.btn') && !e.target.closest('a')) {
                    const jobId = card.getAttribute('data-id');
                    openJobInNewWindow(jobId);
                }
            });
        });
        
        document.querySelectorAll('.btn-view-job').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const jobId = btn.getAttribute('data-id');
                openJobInNewWindow(jobId);
            });
        });
        
        document.querySelectorAll('.btn-share-job').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const jobId = btn.getAttribute('data-id');
                shareJob(jobId);
            });
        });
    }, 100);
}

function updateJobCount() {
    const totalJobsCount = document.getElementById('totalJobsCount');
    if (totalJobsCount) {
        totalJobsCount.textContent = `${allJobs.length}+`;
    }
}

function formatPostedDate(dateString) {
    if (!dateString) return 'Recently';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ============================================
// JOB ACTIONS
// ============================================
function openJobInNewWindow(jobId) {
    const jobDetailURL = `job-detail.html?id=${jobId}`;
    window.open(jobDetailURL, '_blank');
}

function shareJob(jobId) {
    const job = allJobs.find(j => j.id === jobId);
    if (!job) return;
    
    const shareText = `Check out this job: ${job.title} at ${job.company} - ${job.location}`;
    const shareUrl = `${window.location.origin}/job-detail.html?id=${jobId}`;
    
    if (navigator.share) {
        navigator.share({
            title: `${job.title} - ${job.company}`,
            text: shareText,
            url: shareUrl
        }).catch(err => console.log('Share cancelled'));
    } else {
        navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`)
            .then(() => showNotification('Job link copied to clipboard!', 'success'))
            .catch(err => showNotification('Error sharing job', 'error'));
    }
}

// ============================================
// FILTER FUNCTIONS
// ============================================
function applyAllFilters() {
    currentJobPage = 1;
    const filteredJobs = applyFiltersToJobs(allJobs);
    displayJobs(filteredJobs.slice(0, currentJobPage * jobsPerPage));
    updateLoadMoreButton(filteredJobs);
}

function applyFiltersToJobs(jobs) {
    const typeFilter = document.getElementById('jobTypeFilter');
    const experienceFilter = document.getElementById('experienceFilter');
    const locationFilter = document.getElementById('locationFilter');
    const salaryFilter = document.getElementById('salaryFilter');
    
    const type = typeFilter ? typeFilter.value : '';
    const experience = experienceFilter ? experienceFilter.value : '';
    const location = locationFilter ? locationFilter.value : '';
    const salary = salaryFilter ? salaryFilter.value : '';
    
    return jobs.filter(job => {
        const matchesType = !type || job.type === type;
        const matchesExperience = !experience || job.experience.includes(experience);
        const matchesLocation = !location || job.location === location;
        const matchesSalary = !salary || checkSalaryRange(job.salary, salary);
        return matchesType && matchesExperience && matchesLocation && matchesSalary;
    });
}

function checkSalaryRange(jobSalary, range) {
    if (!jobSalary) return true;
    const salaryMatch = jobSalary.match(/₹?(\d+)[\s-]*(\d+)?/);
    if (!salaryMatch) return true;
    const minSalary = parseInt(salaryMatch[1]);
    
    switch(range) {
        case '0-5': return minSalary <= 5;
        case '5-10': return minSalary >= 5 && minSalary <= 10;
        case '10-20': return minSalary >= 10 && minSalary <= 20;
        case '20+': return minSalary >= 20;
        default: return true;
    }
}

function resetAllFilters() {
    const typeFilter = document.getElementById('jobTypeFilter');
    const experienceFilter = document.getElementById('experienceFilter');
    const locationFilter = document.getElementById('locationFilter');
    const salaryFilter = document.getElementById('salaryFilter');
    
    if (typeFilter) typeFilter.value = '';
    if (experienceFilter) experienceFilter.value = '';
    if (locationFilter) locationFilter.value = '';
    if (salaryFilter) salaryFilter.value = '';
    
    currentJobPage = 1;
    displayJobs(allJobs.slice(0, currentJobPage * jobsPerPage));
    updateLoadMoreButton(allJobs);
}

function loadMoreJobs() {
    const spinner = document.getElementById('loadingSpinner');
    const loadMoreText = document.getElementById('loadMoreText');
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    
    if (!spinner || !loadMoreText || !loadMoreBtn) return;
    
    spinner.style.display = 'inline-block';
    loadMoreText.textContent = 'Loading...';
    loadMoreBtn.disabled = true;
    
    setTimeout(() => {
        currentJobPage++;
        const filteredJobs = applyFiltersToJobs(allJobs);
        displayJobs(filteredJobs.slice(0, currentJobPage * jobsPerPage));
        
        spinner.style.display = 'none';
        loadMoreBtn.disabled = false;
        updateLoadMoreButton(filteredJobs);
    }, 500);
}

function updateLoadMoreButton(filteredJobs) {
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    const loadMoreText = document.getElementById('loadMoreText');
    
    if (!loadMoreBtn || !loadMoreText) return;
    
    if (filteredJobs.length > currentJobPage * jobsPerPage) {
        loadMoreBtn.style.display = 'block';
        loadMoreText.textContent = `Load More (${filteredJobs.length - (currentJobPage * jobsPerPage)} remaining)`;
    } else {
        loadMoreBtn.style.display = 'none';
    }
}

// ============================================
// ADMIN AUTHENTICATION
// ============================================
async function handleAdminLogin(e) {
    e.preventDefault();
    
    const usernameInput = document.getElementById('adminUsername');
    const passwordInput = document.getElementById('adminPassword');
    const rememberCheckbox = document.getElementById('rememberAdmin');
    
    if (!usernameInput || !passwordInput) return;
    
    const username = usernameInput.value;
    const password = passwordInput.value;
    const remember = rememberCheckbox ? rememberCheckbox.checked : false;
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            localStorage.setItem('adminUser', JSON.stringify(currentUser));
            
            updateAuthUI();
            hideModal(adminLoginModal);
            showNotification('Admin login successful! Redirecting...', 'success');
            
            adminLoginForm.reset();
            
            setTimeout(() => {
                window.location.href = 'admin-panel.html';
            }, 1000);
        } else {
            showNotification('Invalid admin credentials', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Login failed. Please try again.', 'error');
    }
}

function updateAuthUI() {
    if (!adminLoginBtn) return;
    
    const adminUser = JSON.parse(localStorage.getItem('adminUser'));
    
    if (adminUser && adminUser.role === 'admin') {
        adminLoginBtn.innerHTML = '<i class="fas fa-user-shield"></i> Admin Panel';
        adminLoginBtn.onclick = () => window.location.href = 'admin-panel.html';
        adminLoginBtn.style.background = 'linear-gradient(135deg, #2E8B57, #1e4d2e)';
    } else {
        adminLoginBtn.innerHTML = '<i class="fas fa-user-shield"></i> Admin';
        adminLoginBtn.onclick = () => showModal(adminLoginModal);
        adminLoginBtn.style.background = '';
    }
}

function handlePostJobClick() {
    if (currentUser && currentUser.role === 'admin') {
        window.location.href = 'admin-panel.html#postJob';
    } else {
        showModal(adminLoginModal);
    }
}

// ============================================
// ADMIN INACTIVITY TIMER
// ============================================
function startAdminInactivityTimer() {
    if (currentUser && currentUser.role === 'admin') {
        resetAdminInactivityTimer();
    }
}

function resetAdminInactivityTimer() {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    clearTimeout(adminInactivityTimer);
    adminInactivityTimer = setTimeout(() => {
        if (currentUser && currentUser.role === 'admin') {
            if (!window.location.href.includes('admin-panel.html')) {
                localStorage.removeItem('adminUser');
                currentUser = null;
                updateAuthUI();
                showNotification('Admin session expired. Please login again.', 'warning');
            }
        }
    }, ADMIN_TIMEOUT);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function escapeHTML(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showModal(modal) {
    if (!modal) return;
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function hideModal(modal) {
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function showNotification(message, type = 'info') {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) existingNotification.remove();
    
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
        z-index: 9999;
        animation: slideIn 0.3s ease;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#2E8B57'};
        color: ${type === 'warning' ? '#212529' : 'white'};
    `;
    
    document.body.appendChild(notification);
    
    notification.querySelector('.notification-close').addEventListener('click', () => notification.remove());
    setTimeout(() => notification.remove(), 5000);
}

function toggleAdminPassword() {
    const passwordInput = document.getElementById('adminPassword');
    const toggleIcon = document.getElementById('toggleAdminPassword');
    
    if (!passwordInput || !toggleIcon) return;
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    }
}

function setupAdminFeatures() {
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
}

// Make functions global
window.openJobInNewWindow = openJobInNewWindow;
window.shareJob = shareJob;
