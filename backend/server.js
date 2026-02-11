require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors({
    origin: '*', // Allow all origins for now
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const JWT_SECRET = process.env.JWT_SECRET || 'bangalore-connect-secret-key-2024';

// ============================================
// SERVE STATIC FILES - CRITICAL FIX
// ============================================
const frontendPath = path.join(__dirname, '..', 'frontend');
console.log(`🔍 Looking for frontend at: ${frontendPath}`);

if (fs.existsSync(frontendPath)) {
    console.log(`✅ Frontend directory found`);
    app.use(express.static(frontendPath));
} else {
    console.error(`❌ Frontend directory NOT found at: ${frontendPath}`);
    // Try alternative path
    const altPath = path.join(__dirname, 'frontend');
    if (fs.existsSync(altPath)) {
        console.log(`✅ Found frontend at alternative path: ${altPath}`);
        app.use(express.static(altPath));
    }
}

// ============================================
// DATA DIRECTORY SETUP
// ============================================
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('✅ Data directory created');
}

const usersFile = path.join(dataDir, 'users.json');
const jobsFile = path.join(dataDir, 'jobs.json');

// Initialize JSON files
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
    fs.writeFileSync(jobsFile, JSON.stringify(sampleJobs, null, 2));
    console.log('✅ Jobs file created with sample data');
}

// ============================================
// DATABASE HELPER FUNCTIONS
// ============================================
const database = {
    async getUsers() {
        try {
            const data = fs.readFileSync(usersFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return [];
        }
    },
    
    async saveUsers(users) {
        try {
            fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
            return true;
        } catch (error) {
            return false;
        }
    },
    
    async getJobs() {
        try {
            const data = fs.readFileSync(jobsFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return [];
        }
    },
    
    async saveJobs(jobs) {
        try {
            fs.writeFileSync(jobsFile, JSON.stringify(jobs, null, 2));
            return true;
        } catch (error) {
            return false;
        }
    }
};

// ============================================
// INITIALIZE ADMIN USER
// ============================================
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
        }
    } catch (error) {
        console.error('Error initializing admin:', error);
    }
};

// ============================================
// API HEALTH CHECK
// ============================================
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// ============================================
// ADMIN AUTHENTICATION
// ============================================
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

// ============================================
// JOB API ENDPOINTS
// ============================================
app.get('/api/jobs', async (req, res) => {
    try {
        const jobs = await database.getJobs();
        res.json({
            success: true,
            jobs: jobs.filter(job => job.status === 'active')
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

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
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// ============================================
// SERVE HTML FILES
// ============================================
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

app.get('/admin-panel.html', (req, res) => {
    res.sendFile(path.join(frontendPath, 'admin-panel.html'));
});

app.get('/job-detail.html', (req, res) => {
    res.sendFile(path.join(frontendPath, 'job-detail.html'));
});

// ============================================
// START SERVER
// ============================================
const startServer = async () => {
    try {
        await initializeAdmin();
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log('\n' + '='.repeat(50));
            console.log('🚀 SERVER STARTED SUCCESSFULLY');
            console.log('='.repeat(50));
            console.log(`📡 Port: ${PORT}`);
            console.log(`🔗 URL: http://localhost:${PORT}`);
            console.log(`📁 Frontend: ${frontendPath}`);
            console.log('='.repeat(50));
            console.log('👤 Admin: admin@bangaloreconnect.com / admin123');
            console.log('='.repeat(50) + '\n');
        });
    } catch (error) {
        console.error('❌ Server failed to start:', error);
        process.exit(1);
    }
};

startServer();
