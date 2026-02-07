const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize submissions file if it doesn't exist
if (!fs.existsSync(SUBMISSIONS_FILE)) {
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify([], null, 2));
}

class Submission {
    static getAll() {
        const data = fs.readFileSync(SUBMISSIONS_FILE, 'utf8');
        return JSON.parse(data);
    }

    static getById(id) {
        const submissions = this.getAll();
        return submissions.find(sub => sub.id === id);
    }

    static create(formData) {
        const submissions = this.getAll();
        
        const submission = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            ...formData,
            compilations: this.determineCompilations(formData),
            archived: false
        };

        submissions.push(submission);
        fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));
        
        return submission;
    }

    static archive(id) {
        const submissions = this.getAll();
        const submission = submissions.find(sub => sub.id === id);
        
        if (submission) {
            submission.archived = true;
            submission.archivedAt = new Date().toISOString();
            fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));
            return true;
        }
        return false;
    }

    static unarchive(id) {
        const submissions = this.getAll();
        const submission = submissions.find(sub => sub.id === id);
        
        if (submission) {
            submission.archived = false;
            delete submission.archivedAt;
            fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));
            return true;
        }
        return false;
    }

    static getActive() {
        return this.getAll().filter(sub => !sub.archived);
    }

    static getArchived() {
        return this.getAll().filter(sub => sub.archived);
    }

    static delete(id) {
        const submissions = this.getAll();
        const filtered = submissions.filter(sub => sub.id !== id);
        fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(filtered, null, 2));
        return filtered.length < submissions.length;
    }

    static determineCompilations(data) {
        const compilations = [];
        const genre = data.genre;
        const vibe = data.vibe;
        const isDebut = data.debutRelease === 'Yes';
        
        // 1. Genre-based compilation
        const genreMap = {
            'Indie Rock': 'Indie Rock Chronicles',
            'Dream Pop': 'Dream State Anthology',
            'Lo-Fi': 'Lo-Fi Sessions Vol. X',
            'Folk': 'Acoustic Storytellers',
            'Electronic': 'Synth & Circuits',
            'Alternative': 'Alternative Edge',
            'Post-Punk': 'Post-Punk Revival',
            'Shoegaze': 'Walls of Sound',
            'Emo': 'Emotional Landscapes',
            'Other': 'Genre-Bending Experiments'
        };
        
        if (genreMap[genre]) {
            compilations.push(genreMap[genre]);
        }
        
        // 2. Vibe/Mood-based compilation
        const vibeMap = {
            'Chill': 'Chill Indie Vibes',
            'Energetic': 'High Energy Indie',
            'Melancholic': 'Sad Boy/Girl Hours',
            'Dark': 'Midnight Sessions',
            'Dreamy': 'Ethereal Soundscapes',
            'Raw': 'Raw & Unfiltered',
            'Nostalgic': 'Throwback Feels',
            'Experimental': 'Avant-Garde Collective'
        };
        
        if (vibeMap[vibe]) {
            compilations.push(vibeMap[vibe]);
        }
        
        // 3. Seasonal/timing-based
        const releaseDate = new Date(data.releaseDate);
        const month = releaseDate.getMonth();
        
        if (month >= 2 && month <= 4) {
            compilations.push('Spring Indie Collection');
        } else if (month >= 5 && month <= 7) {
            compilations.push('Summer Indie Hits');
        } else if (month >= 8 && month <= 10) {
            compilations.push('Fall Vibes Playlist');
        } else {
            compilations.push('Winter Indie Warmth');
        }
        
        // 4. New artist spotlight
        if (isDebut) {
            compilations.push('🌟 Fresh Voices Spotlight');
        }
        
        // 5. Special compilations based on keywords
        const keywords = (data.keywords || '').toLowerCase();
        if (keywords.includes('heartbreak') || keywords.includes('breakup')) {
            compilations.push('Heartbreak Anthems');
        }
        if (keywords.includes('late night') || keywords.includes('3am')) {
            compilations.push('3AM Feelings');
        }
        if (keywords.includes('diy') || keywords.includes('bedroom')) {
            compilations.push('DIY Bedroom Producers');
        }
        
        return compilations;
    }

    static getStats() {
        const submissions = this.getAll();
        const active = submissions.filter(sub => !sub.archived);
        const archived = submissions.filter(sub => sub.archived);
        
        return {
            total: submissions.length,
            active: active.length,
            archived: archived.length,
            byGenre: this.countBy(active, 'genre'),
            byVibe: this.countBy(active, 'vibe'),
            byFormat: this.countBy(active, 'format'),
            recent: active.slice(-5).reverse()
        };
    }

    static countBy(submissions, field) {
        return submissions.reduce((acc, sub) => {
            const value = sub[field] || 'Unknown';
            acc[value] = (acc[value] || 0) + 1;
            return acc;
        }, {});
    }
}

module.exports = Submission;