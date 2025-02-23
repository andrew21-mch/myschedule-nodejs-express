// Backend (Node.js + Express + MongoDB)
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const moment = require('moment');
const cron = require('node-cron');
const app = express();

app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/scheduleDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const scheduleSchema = new mongoose.Schema({
    day: String,
    time: String,
    task: String,
    reminderTime: String 
});

const Schedule = mongoose.model('Schedule', scheduleSchema);

// API Routes
app.get('/schedule', async (req, res) => {
    const schedule = await Schedule.find();
    res.json(schedule);
});

app.post('/schedule', async (req, res) => {
    const newEntry = new Schedule(req.body);
    await newEntry.save();
    res.json(newEntry);
});

app.post('/schedule/bulk-insert', async (req, res) => {
    try {
      const tasks = req.body;
      if (!Array.isArray(tasks) || tasks.length === 0) {
        return res.status(400).json({ error: "Invalid data format. Expecting an array of tasks." });
      }
  
      await Schedule.insertMany(tasks);
      res.json({ message: "Schedule inserted successfully!", count: tasks.length });
    } catch (error) {
      console.error("Bulk insert error:", error);
      res.status(500).json({ error: "Failed to insert schedule." });
    }
  });

app.delete('/schedule', async (req, res) => {
    try {
      await Schedule.deleteMany({});
      res.json({ message: "Schedule cleared successfully!" });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear schedule" });
    }
  });

app.listen(5000, () => console.log('Server running on port 5000'));
