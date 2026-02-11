const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware - Updated for production
app.use(cors({
    origin: [
        'http://localhost:3000', 
        'http://127.0.0.1:5500', 
        'http://localhost:5000',
        'https://yourdomain.com', // REPLACE WITH YOUR ACTUAL DOMAIN
        'https://www.yourdomain.com' // REPLACE WITH YOUR ACTUAL DOMAIN
    ],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// JWT Secret - Use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'job-portal-secret-key-change-in-production';

// Database functions - File based storage
const database = {
    async getUsers() {
        try {
            const data = await fs.readFile(path.join(__dirname, 'data', 'users.json'), 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return [];
        }
    },
    
    async saveUsers(users) {
        await fs.writeFile(path.join(__dirname, 'data', 'users.json'), JSON.stringify(users, null, 2));
    },
    
    async getJobs() {
        try {
            const data = await fs.readFile(path.join(__dirname, 'data', 'jobs.json'), 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return [];
        }
    },
    
    async saveJobs(jobs) {
        await fs.writeFile(path.join(__dirname, 'data', 'jobs.json'), JSON.stringify(jobs, null, 2));
    },
    
    async getApplications() {
        try {
            const data = await fs.readFile(path.join(__dirname, 'data', 'applications.json'), 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return [];
        }
    },
    
    async saveApplications(applications) {
        await fs.writeFile(path.join(__dirname, 'data', 'applications.json'), JSON.stringify(applications, null, 2));
    }
};

// Create data directory if it doesn't exist
const ensureDataDirectory = async () => {
    const dataDir = path.join(__dirname, 'data');
    try {
        await fs.access(dataDir);
    } catch (error) {
        await fs.mkdir(dataDir, { recursive: true });
    }
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

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

// Initialize default admin user
const initializeAdmin = async () => {
    await ensureDataDirectory();
    const users = await database.getUsers();
    const adminExists = users.find(u => u.email === 'admin@jobportal.com');
    
    if (!adminExists) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const adminUser = {
            id: Date.now().toString(),
            name: 'Admin',
            email: 'admin@jobportal.com',
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
    }
};

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// User Registration
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password, phone, skills, experience } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email, and password are required' });
        }
        
        const users = await database.getUsers();
        const existingUser = users.find(u => u.email === email);
        
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const user = {
            id: Date.now().toString(),
            name,
            email,
            password: hashedPassword,
            phone: phone || '',
            skills: skills ? skills.split(',').map(s => s.trim()) : [],
            experience: experience || '',
            role: 'user',
            createdAt: new Date().toISOString()
        };
        
        users.push(user);
        await database.saveUsers(users);
        
        const token = jwt.sign(
            { 
                id: user.id, 
                email: user.email, 
                name: user.name,
                role: user.role 
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error', 
            error: error.message 
        });
    }
});

// Admin Login - Simplified for production
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
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
        res.status(500).json({ 
            success: false,
            message: 'Server error' 
        });
    }
});

// Get all jobs (public)
app.get('/api/jobs', async (req, res) => {
    try {
        const jobs = await database.getJobs();
        res.json({
            success: true,
            jobs: jobs.filter(job => job.status === 'active')
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get job by ID
app.get('/api/jobs/:id', async (req, res) => {
    try {
        const jobs = await database.getJobs();
        const job = jobs.find(j => j.id === req.params.id && j.status === 'active');
        
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }
        
        res.json({
            success: true,
            job
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
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
        
        if (!title || !company || !description || !location || !salary || !type || !experience) {
            return res.status(400).json({ message: 'All required fields must be filled' });
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
            postedBy: req.user.id,
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
        res.status(500).json({ message: 'Server error' });
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
        res.status(500).json({ message: 'Server error' });
    }
});

// Update job status
app.patch('/api/jobs/:id/status', authenticateAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const jobs = await database.getJobs();
        const jobIndex = jobs.findIndex(j => j.id === req.params.id);
        
        if (jobIndex === -1) {
            return res.status(404).json({ message: 'Job not found' });
        }
        
        jobs[jobIndex].status = status;
        await database.saveJobs(jobs);
        
        res.json({
            success: true,
            message: 'Job status updated'
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
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
        res.status(500).json({ message: 'Server error' });
    }
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Initialize and start server
const startServer = async () => {
    try {
        await initializeAdmin();
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server is running on port ${PORT}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔗 Frontend: http://localhost:${PORT}`);
            console.log(`👤 Admin Login: admin / admin123`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();