const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static('.'));

// Handle SPA routing - serve index.html for all routes
app.get('*', (req, res) => {
    if (req.path.endsWith('.html') || req.path === '/') {
        res.sendFile(path.join(__dirname, req.path === '/' ? 'index.html' : req.path));
    } else {
        res.status(404).send('Not found');
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Cashivo server running at http://localhost:${PORT}`);
    console.log('📊 Finance tracking app ready for development!');
});
