const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration
const corsOptions = {
  origin: [
    "https://shannahjongstra.be",
    "https://www.shannahjongstra.be",
    "http://localhost:3000", // For local development
    "http://localhost:3001", // For local development
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Create uploads directory if it doesn't exist
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// MongoDB Connection
mongoose.connect("mongodb://127.0.0.1:27017/shannah_portfolio", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// MongoDB Schemas
const portfolioSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  type: { type: String, enum: ["text", "photo"], required: true },
  image: String,
  link: String,
  createdAt: { type: Date, default: Date.now },
});

const blogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  excerpt: String,
  image: String,
  createdAt: { type: Date, default: Date.now },
});

const contactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  subject: String,
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const settingsSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  value: String,
});

// Models
const Portfolio = mongoose.model("Portfolio", portfolioSchema);
const Blog = mongoose.model("Blog", blogSchema);
const Contact = mongoose.model("Contact", contactSchema);
const Settings = mongoose.model("Settings", settingsSchema);

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// API Routes
// Health check endpoint
app.get("/api/health", (req, res) => {
  const dbStatus =
    mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    database: dbStatus,
    uptime: process.uptime(),
    message: "Shannah Portfolio API is running!",
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Shannah Portfolio API Server",
    status: "running",
    endpoints: ["/api/health", "/api/portfolio", "/api/blog", "/api/contact"],
  });
});
// Portfolio Routes
app.get("/api/portfolio", async (req, res) => {
  try {
    const { type } = req.query;
    const filter = type && type !== "all" ? { type } : {};
    const portfolios = await Portfolio.find(filter).sort({ createdAt: -1 });
    res.json(portfolios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/portfolio/:id", async (req, res) => {
  try {
    const portfolio = await Portfolio.findById(req.params.id);
    res.json(portfolio);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/portfolio", upload.single("image"), async (req, res) => {
  try {
    const portfolioData = {
      ...req.body,
      image: req.file ? `/uploads/${req.file.filename}` : null,
    };
    const portfolio = new Portfolio(portfolioData);
    await portfolio.save();
    res.status(201).json(portfolio);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/portfolio/:id", upload.single("image"), async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
    }
    const portfolio = await Portfolio.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    res.json(portfolio);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/portfolio/:id", async (req, res) => {
  try {
    await Portfolio.findByIdAndDelete(req.params.id);
    res.json({ message: "Portfolio item deleted" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Blog Routes
app.get("/api/blog", async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/blog/:id", async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    res.json(blog);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/blog", upload.single("image"), async (req, res) => {
  try {
    // Create excerpt from HTML content
    const stripHtml = (html) => {
      return html.replace(/<[^>]*>/g, "").trim();
    };

    const blogData = {
      ...req.body,
      excerpt:
        req.body.excerpt ||
        stripHtml(req.body.content).substring(0, 150) + "...",
      image: req.file ? `/uploads/${req.file.filename}` : null,
    };

    const blog = new Blog(blogData);
    await blog.save();
    res.status(201).json(blog);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/blog/:id", upload.single("image"), async (req, res) => {
  try {
    const stripHtml = (html) => {
      return html.replace(/<[^>]*>/g, "").trim();
    };

    const updateData = {
      ...req.body,
      excerpt:
        req.body.excerpt ||
        stripHtml(req.body.content).substring(0, 150) + "...",
    };

    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
    }

    const blog = await Blog.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });
    res.json(blog);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/blog/:id", async (req, res) => {
  try {
    await Blog.findByIdAndDelete(req.params.id);
    res.json({ message: "Blog post deleted" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Contact Routes
app.post("/api/contact", async (req, res) => {
  try {
    const contact = new Contact(req.body);
    await contact.save();
    res.status(201).json({ message: "Message sent successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/contact", async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Settings Routes
app.get("/api/settings", async (req, res) => {
  try {
    const settings = await Settings.find();
    const settingsObj = {};
    settings.forEach((setting) => {
      settingsObj[setting.key] = setting.value;
    });
    res.json(settingsObj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/settings", async (req, res) => {
  try {
    const { key, value } = req.body;
    await Settings.findOneAndUpdate(
      { key },
      { value },
      { upsert: true, new: true }
    );
    res.json({ message: "Settings updated" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Serve React build files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "build")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "build", "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
