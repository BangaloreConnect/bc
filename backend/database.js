const fs = require('fs').promises;
const path = require('path');

const dataDir = path.join(__dirname, 'data');

// Ensure data directory exists
if (!require('fs').existsSync(dataDir)) {
    require('fs').mkdirSync(dataDir, { recursive: true });
}

const defaultData = {
    users: [],
    jobs: [],
    applications: []
};

async function readData(file) {
    try {
        const data = await fs.readFile(path.join(dataDir, file), 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // If file doesn't exist, return default data
        if (error.code === 'ENOENT') {
            await fs.writeFile(path.join(dataDir, file), JSON.stringify(defaultData[file.split('.')[0]], null, 2));
            return defaultData[file.split('.')[0]];
        }
        throw error;
    }
}

async function writeData(file, data) {
    await fs.writeFile(path.join(dataDir, file), JSON.stringify(data, null, 2));
}

module.exports = {
    // Users
    async getUsers() {
        return await readData('users.json');
    },
    
    async saveUsers(users) {
        await writeData('users.json', users);
    },
    
    // Jobs
    async getJobs() {
        return await readData('jobs.json');
    },
    
    async saveJobs(jobs) {
        await writeData('jobs.json', jobs);
    },
    
    // Applications
    async getApplications() {
        return await readData('applications.json');
    },
    
    async saveApplications(applications) {
        await writeData('applications.json', applications);
    }
};