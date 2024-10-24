const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/confessionsDB', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.log('Error connecting to MongoDB:', err));

// Confession schema and model
const confessionSchema = new mongoose.Schema({
    title: { type: String, required: true },
    body: { type: String, required: true },
    tags: [String],
    reactions: {
        love: { type: Number, default: 0 },
        sad: { type: Number, default: 0 },
        laugh: { type: Number, default: 0 },
        userReactions: { type: [String], default: [] } // Store user reactions as strings
    }
});

const Confession = mongoose.model('Confession', confessionSchema);

// Endpoint to create a new confession
app.post('/confessions', async (req, res) => {
    const { title, body, tags } = req.body;

    try {
        const newConfession = new Confession({ 
            title, 
            body, 
            tags 
        });
        await newConfession.save();
        res.status(201).json({ message: 'Confession created successfully!', confessionId: newConfession._id });
    } catch (error) {
        console.error('Error creating confession:', error);
        res.status(500).json({ message: 'Error creating confession' });
    }
});


app.post('/confessions/:id/reactions', async (req, res) => {
    const { reactionType, userId } = req.body;

    try {
        const confessionId = req.params.id;
        console.log('Confession ID from params:', confessionId); // Debug line
        const confession = await Confession.findById(confessionId);

        if (!confession) {
            return res.status(404).json({ message: 'Confession not found' });
        }

        // Check if the user has already reacted
        if (confession.reactions.userReactions.includes(userId)) {
            return res.status(400).json({ status: 'error', message: 'User has already reacted' });
        }
        
        // Other 400 errors:
        return res.status(400).json({ status: 'error', message: 'Invalid reaction type' });
        

        // Increment the specific reaction count
        if (confession.reactions[reactionType] !== undefined) {
            confession.reactions[reactionType] += 1; // Increment the count for the specific reaction
        } else {
            return res.status(400).json({ message: 'Invalid reaction type' });
        }

        confession.reactions.userReactions.push(userId); // Add user to the list of those who reacted
        await confession.save(); // Save the updated confession

        res.status(200).json(confession); // Send the updated confession back as JSON
    } catch (error) {
        console.error('Error updating reaction:', error);
        res.status(500).json({ message: 'Error updating reaction' }); // Return error as JSON
    }
});


// Endpoint to get random confessions based on a random tag
app.get('/api/confessions/random', async (req, res) => {
    try {
        const confessions = await Confession.aggregate([{ $sample: { size: 5 } }]); // Example to fetch random confessions
        res.json({ confessions });
    } catch (error) {
        console.error('Error fetching random confessions:', error);
        res.status(500).json({ message: 'Error fetching confessions' });
    }
});

// Endpoint to get confessions by tag
app.get('/api/confessions/tag/:tag', async (req, res) => {
    const { tag } = req.params;
    try {
        const confessions = await Confession.find({ tags: tag });

        const confessionsWithId = confessions.map(confession => ({
            id: confession._id,
            title: confession.title,
            body: confession.body,
            tags: confession.tags,
            reactions: confession.reactions
        }));

        res.json(confessionsWithId);
    } catch (error) {
        console.error('Error fetching confessions by tag:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Serve static files
app.use(express.static('public'));

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
