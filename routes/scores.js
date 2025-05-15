const express = require('express');
const router = express.Router();
const Score = require('../models/Score');
const auth = require('../middleware/auth');

// Get user's scores
router.get('/user', auth, async (req, res) => {
  try {
    const scores = await Score.find({ user: req.user.id })
      .sort({ date: -1 })
      .populate('user', ['username']);
    res.json(scores);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const scores = await Score.find()
      .sort({ score: -1 })
      .limit(10)
      .populate('user', ['username']);
    res.json(scores);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Add new score
router.post('/', auth, async (req, res) => {
  try {
    const { score, totalQuestions, category, timePerQuestion } = req.body;

    const newScore = new Score({
      user: req.user.id,
      score,
      totalQuestions,
      category,
      timePerQuestion
    });

    const savedScore = await newScore.save();
    res.json(savedScore);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router; 