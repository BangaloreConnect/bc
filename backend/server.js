const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;

/* ============================================
   MIDDLEWARE
============================================ */

// Simple production-safe CORS
app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ============================================
   JWT SECRET
============================================ */

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';

/* ============================================
   FILE DATABASE
============================================ */

const dataDir = path.join(__dirname, 'data');

const database = {
    async read(file) {
        try {
            const data = await fs.readFile(path.join(dataDir, file), 'utf8');
            return JSON.parse(data);
        } catch {
            return [];
        }
    },

    async write(file, data) {
        await fs.writeFile(
            path.join(dataDir, file),
            JSON.stringify(data, null, 2)
        );
    }
};

const ensureDataDirectory = async () => {
    try {
        await fs.access(dataDir);
    } catch {
        await fs.mkdir(dataDir, { recursive: true });
    }
};

/* ============================================
   AUTH MIDDLEWARE
============================================ */

const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err || user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }
        req.user = user;
        next();
    });
};

/* ============================================
   INITIALIZE ADMIN
============================================ */

const initializeAdmin = async () => {
    await ensureDataDirectory();
    const users = await database.read('users.json');

    const adminExists = users.find(u => u.username === 'admin');

    if (!adminExists) {
        const hashedPassword = await bcrypt.hash('admin123', 10);

        users.push({
            id: Date.now().toString(),
            username: 'admin',
            password: hashedPassword,
            role: 'admin',
            createdAt: new Date().toISOString()
        });

        await database.write('users.json', users);
        console.log('✅ Default admin created');
    }
};

/* ============================================
   API ROUTES
============================================ */

// Health
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'Server Running ✅',
        timestamp: new Date().toISOString()
    });
});

// Admin Login
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;

    const users = await database.read('users.json');
    const admin = users.find(u => u.username === username && u.role === 'admin');

    if (!admin) {
        return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, admin.password);

    if (!validPassword) {
        return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
        { id: admin.id, role: 'admin' },
        JWT_SECRET,
        { expiresIn: '1d' }
    );

    res.json({
        success: true,
        token,
        user: { username: 'admin', role: 'admin' }
    });
});

// Get Jobs (Public)
app.get('/api/jobs', async (req, res) => {
    const jobs = await database.read('jobs.json');
    res.json({
        success: true,
        jobs: jobs.filter(j => j.status === 'active')
    });
});

// Create Job (Admin)
app.post('/api/jobs', authenticateAdmin, async (req, res) => {
    const {
        title,
        company,
        location,
        salary,
        type,
        experience,
        description,
        applyLink
    } = req.body;

    if (!title || !company || !description) {
        return res.status(400).json({
            success: false,
            message: 'Required fields missing'
        });
    }

    const jobs = await database.read('jobs.json');

    const newJob = {
        id: Date.now().toString(),
        title,
        company,
        location,
        salary,
        type,
        experience,
        description,
        applyLink: applyLink || '',
        status: 'active',
        createdAt: new Date().toISOString()
    };

    jobs.push(newJob);
    await database.write('jobs.json', jobs);

    res.status(201).json({
        success: true,
        message: 'Job created successfully',
        job: newJob
    });
});

/* ============================================
   SERVE FRONTEND
============================================ */

app.use(express.static(path.join(__dirname, '../frontend')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

/* ============================================
   START SERVER
============================================ */

const startServer = async () => {
    try {
        await initializeAdmin();

        app.listen(PORT, '0.0.0.0', () => {
            console.log('================================');
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log('👤 Admin Login → admin / admin123');
            console.log('================================');
        });

    } catch (error) {
        console.error('Server start failed:', error);
        process.exit(1);
    }
};

startServer();
