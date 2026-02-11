const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware - UPDATED with your actual Render URL
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? [
            'https://bangaloreconnect.com', 
            'https://www.bangaloreconnect.com',
            'https://bangalore-connect.onrender.com',
            'https://bc-xjam.onrender.com'  // ADDED YOUR ACTUAL RENDER URL
          ]
        : ['http://localhost:3000', 'http://127.0.0.1:5500', 'http://localhost:5000'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// JWT Secret - Use environment variable in production
const JWT_SECRET = process.env.JWT_SECRET || 'job-portal-secret-key-change-in-production';

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('✅ Data directory created');
}

// File paths
const usersFile = path.join(dataDir, 'users.json');
const jobsFile = path.join(dataDir, 'jobs.json');

// Initialize JSON files if they don't exist
if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, JSON.stringify([]));
    console.log('✅ Users file created');
}

if (!fs.existsSync(jobsFile)) {
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
    fs.writeFileSync(jobsFile, JSON.stringify(sampleJobs));
    console.log('✅ Jobs file created with sample data');
}

// Database helper functions
const database = {
    async getUsers() {
        try {
            const data = fs.readFileSync(usersFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading users:', error);
            return [];
        }
    },
    
    async saveUsers(users) {
        try {
            fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving users:', error);
            return false;
        }
    },
    
    async getJobs() {
        try {
            const data = fs.readFileSync(jobsFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading jobs:', error);
            return [];
        }
    },
    
    async saveJobs(jobs) {
        try {
            fs.writeFileSync(jobsFile, JSON.stringify(jobs, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving jobs:', error);
            return false;
        }
    }
};

// Initialize default admin user
const initializeAdmin = async () => {
    try {
        const users = await database.getUsers();
        const adminExists = users.find(u => u.role === 'admin');
        
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const adminUser = {
                id: Date.now().toString(),
                name: 'Admin',
                email: 'admin@bangaloreconnect.com',
                password: hashedPassword,
                role: 'admin',
                phone: '',
                skills: [],
                experience: '',
                createdAt: new Date().toISOString()
            };
            users.push(adminUser);
            await database.saveUsers(users);
            console.log('✅ Default admin user created');
            console.log('   Email: admin@bangaloreconnect.com');
            console.log('   Password: admin123');
        }
    } catch (error) {
        console.error('Error initializing admin:', error);
    }
};

// Serve static files from frontend - FIXED PATH
app.use(express.static(path.join(__dirname, 'frontend'))); // REMOVED '../' - NOW LOOKS IN SAME DIRECTORY

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Server is running',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
    });
});

// Admin Login
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Simple validation for demo
        if (username === 'admin' && password === 'admin123') {
            const token = jwt.sign(
                { 
                    id: 'admin123',
                    username: 'admin',
                    role: 'admin' 
                },
                JWT_SECRET,
                { expiresIn: '1d' }
            );
            
            return res.json({
                success: true,
                message: 'Admin login successful',
                token,
                user: {
                    username: 'admin',
                    role: 'admin'
                }
            });
        }
        
        res.status(400).json({ 
            success: false,
            message: 'Invalid credentials' 
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error' 
        });
    }
});

// Authentication middleware
const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token' });
        }
        
        if (user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        
        req.user = user;
        next();
    });
};

// Get all jobs (public)
app.get('/api/jobs', async (req, res) => {
    try {
        const jobs = await database.getJobs();
        res.json({
            success: true,
            jobs: jobs.filter(job => job.status === 'active')
        });
    } catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Get job by ID (public)
app.get('/api/jobs/:id', async (req, res) => {
    try {
        const jobs = await database.getJobs();
        const job = jobs.find(j => j.id === req.params.id);
        
        if (!job) {
            return res.status(404).json({ 
                success: false, 
                message: 'Job not found' 
            });
        }
        
        res.json({
            success: true,
            job
        });
    } catch (error) {
        console.error('Error fetching job:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Create job (admin only)
app.post('/api/jobs', authenticateAdmin, async (req, res) => {
    try {
        const {
            title,
            company,
            location,
            salary,
            type,
            experience,
            description,
            requirements,
            benefits,
            applyLink
        } = req.body;
        
        // Validate required fields
        if (!title || !company || !location || !salary || !type || !experience || !description) {
            return res.status(400).json({ 
                success: false,
                message: 'All required fields must be filled' 
            });
        }
        
        const jobs = await database.getJobs();
        
        const newJob = {
            id: Date.now().toString(),
            title,
            company,
            location,
            salary,
            type,
            experience,
            description,
            requirements: requirements ? requirements.split('\n').filter(r => r.trim()) : [],
            benefits: benefits ? benefits.split('\n').filter(b => b.trim()) : [],
            applyLink: applyLink || '',
            postedBy: req.user.id || 'admin',
            status: 'active',
            createdAt: new Date().toISOString(),
            applicants: 0
        };
        
        jobs.push(newJob);
        await database.saveJobs(jobs);
        
        res.status(201).json({
            success: true,
            message: 'Job posted successfully',
            job: newJob
        });
    } catch (error) {
        console.error('Create job error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error' 
        });
    }
});

// Get all jobs for admin
app.get('/api/admin/jobs', authenticateAdmin, async (req, res) => {
    try {
        const jobs = await database.getJobs();
        res.json({
            success: true,
            jobs
        });
    } catch (error) {
        console.error('Error fetching admin jobs:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error' 
        });
    }
});

// Update job status (admin only)
app.patch('/api/jobs/:id/status', authenticateAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const jobs = await database.getJobs();
        const jobIndex = jobs.findIndex(j => j.id === req.params.id);
        
        if (jobIndex === -1) {
            return res.status(404).json({ 
                success: false,
                message: 'Job not found' 
            });
        }
        
        jobs[jobIndex].status = status;
        await database.saveJobs(jobs);
        
        res.json({
            success: true,
            message: 'Job status updated'
        });
    } catch (error) {
        console.error('Error updating job status:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error' 
        });
    }
});

// Delete job (admin only)
app.delete('/api/jobs/:id', authenticateAdmin, async (req, res) => {
    try {
        const jobs = await database.getJobs();
        const filteredJobs = jobs.filter(j => j.id !== req.params.id);
        
        if (jobs.length === filteredJobs.length) {
            return res.status(404).json({ 
                success: false,
                message: 'Job not found' 
            });
        }
        
        await database.saveJobs(filteredJobs);
        
        res.json({
            success: true,
            message: 'Job deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting job:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error' 
        });
    }
});

// Dashboard stats for admin
app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
    try {
        const jobs = await database.getJobs();
        
        const stats = {
            totalJobs: jobs.length,
            activeJobs: jobs.filter(j => j.status === 'active').length
        };
        
        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error' 
        });
    }
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html')); // FIXED PATH
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// Start server
const startServer = async () => {
    try {
        await initializeAdmin();
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log('\n=================================');
            console.log(`🚀 Server is running on port ${PORT}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔗 Frontend: http://localhost:${PORT}`);
            console.log(`📁 Data directory: ${dataDir}`);
            console.log('=================================\n');
            console.log('👤 Admin Credentials:');
            console.log('   Email: admin@bangaloreconnect.com');
            console.log('   Password: admin123');
            console.log('=================================\n');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    process.exit(0);
});
