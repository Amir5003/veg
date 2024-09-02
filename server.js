const express = require('express');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const errorHandler = require('./middleware/errorHandler');
const multer = require('multer');

dotenv.config();
connectDB();

const app = express();

// Check if the uploads folder exists, if not, create it
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Middleware to parse JSON
app.use(express.json());
app.use(express.urlencoded({extended : false}))

// Middleware to parse form-data (for file uploads)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', upload.single('image'), productRoutes);
app.use('/uploads', express.static('uploads'));
app.use('/api/cart', cartRoutes);


// Error Handler Middleware
app.use(errorHandler);

app.use((req, res, next) => {
    res.status(404).send('Route not found');
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
