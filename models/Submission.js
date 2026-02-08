const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');
const AUDIT_LOG_FILE = path.join(DATA_DIR, 'audit_log.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize submissions file if it doesn't exist
if (!fs.existsSync(SUBMISSIONS_FILE)) {
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify([], null, 2));
}

// Initialize audit log file if it doesn't exist
if (!fs.existsSync(AUDIT_LOG_FILE)) {
    fs.writeFileSync(AUDIT_LOG_FILE, JSON.stringify([], null, 2));
}

class Submission {
    static getAll(includeDeleted = false) {
        const data = fs.readFileSync(SUBMISSIONS_FILE, 'utf8');
        const submissions = JSON.parse(data);
        
        if (includeDeleted) {
            return submissions;
        }
        
        return submissions.filter(sub => !sub.deleted);
    }

    static getById(id) {
        const submissions = this.getAll(true);
        return submissions.find(sub => sub.id === id);
    }

    static create(formData) {
        const submissions = this.getAll(true);
        
        const submission = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            ...formData,
            compilations: this.determineCompilations(formData),
            archived: false,
            deleted: false,
            status: 'pending' // pending, reviewed, approved, rejected
        };

        submissions.push(submission);
        fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));
        
        this.logAction('create', submission.id, null, 'New submission created');
        
        return submission;
    }

    static archive(id, adminUsername) {
        const submissions = this.getAll(true);
        const submission = submissions.find(sub => sub.id === id);
        
        if (submission && !submission.deleted) {
            submission.archived = true;
            submission.archivedAt = new Date().toISOString();
            submission.archivedBy = adminUsername;
            fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));
            
            this.logAction('archive', id, adminUsername, 'Submission archived');
            return true;
        }
        return false;
    }

    static unarchive(id, adminUsername) {
        const submissions = this.getAll(true);
        const submission = submissions.find(sub => sub.id === id);
        
        if (submission && !submission.deleted) {
            submission.archived = false;
            delete submission.archivedAt;
            delete submission.archivedBy;
            fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));
            
            this.logAction('unarchive', id, adminUsername, 'Submission unarchived');
            return true;
        }
        return false;
    }

    static softDelete(id, adminUsername) {
        const submissions = this.getAll(true);
        const submission = submissions.find(sub => sub.id === id);
        
        if (submission) {
            submission.deleted = true;
            submission.deletedAt = new Date().toISOString();
            submission.deletedBy = adminUsername;
            fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));
            
            this.logAction('soft_delete', id, adminUsername, 'Submission moved to trash');
            return true;
        }
        return false;
    }

    static restore(id, adminUsername) {
        const submissions = this.getAll(true);
        const submission = submissions.find(sub => sub.id === id);
        
        if (submission && submission.deleted) {
            submission.deleted = false;
            delete submission.deletedAt;
            delete submission.deletedBy;
            fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));
            
            this.logAction('restore', id, adminUsername, 'Submission restored from trash');
            return true;
        }
        return false;
    }

    static permanentDelete(id, adminUsername) {
        const submissions = this.getAll(true);
        const filtered = submissions.filter(sub => sub.id !== id);
        fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(filtered, null, 2));
        
        this.logAction('permanent_delete', id, adminUsername, 'Submission permanently deleted');
        return filtered.length < submissions.length;
    }

    static bulkArchive(ids, adminUsername) {
        let count = 0;
        ids.forEach(id => {
            if (this.archive(id, adminUsername)) {
                count++;
            }
        });
        return count;
    }

    static bulkDelete(ids, adminUsername) {
        let count = 0;
        ids.forEach(id => {
            if (this.softDelete(id, adminUsername)) {
                count++;
            }
        });
        return count;
    }

    static updateStatus(id, status, adminUsername) {
        const submissions = this.getAll(true);
        const submission = submissions.find(sub => sub.id === id);
        
        if (submission) {
            const oldStatus = submission.status;
            submission.status = status;
            submission.statusUpdatedAt = new Date().toISOString();
            submission.statusUpdatedBy = adminUsername;
            fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));
            
            this.logAction('status_update', id, adminUsername, `Status changed from ${oldStatus} to ${status}`);
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

    static getDeleted() {
        return this.getAll(true).filter(sub => sub.deleted);
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
        const all = this.getAll(true);
        const active = all.filter(sub => !sub.archived && !sub.deleted);
        const archived = all.filter(sub => sub.archived && !sub.deleted);
        const deleted = all.filter(sub => sub.deleted);
        
        return {
            total: all.length - deleted.length, // Don't count deleted in total
            active: active.length,
            archived: archived.length,
            deleted: deleted.length,
            byStatus: {
                pending: active.filter(s => s.status === 'pending').length,
                reviewed: active.filter(s => s.status === 'reviewed').length,
                approved: active.filter(s => s.status === 'approved').length,
                rejected: active.filter(s => s.status === 'rejected').length
            },
            byGenre: this.countBy(active, 'genre'),
            byVibe: this.countBy(active, 'vibe'),
            byFormat: this.countBy(active, 'format'),
            recent: active.slice(-5).reverse(),
            recentArchived: archived.slice(-5).reverse(),
            recentDeleted: deleted.slice(-5).reverse()
        };
    }

    static countBy(submissions, field) {
        return submissions.reduce((acc, sub) => {
            const value = sub[field] || 'Unknown';
            acc[value] = (acc[value] || 0) + 1;
            return acc;
        }, {});
    }

    static search(query, filters = {}) {
        let submissions = this.getAll();
        
        // Apply filters
        if (filters.status) {
            submissions = submissions.filter(sub => sub.status === filters.status);
        }
        
        if (filters.genre) {
            submissions = submissions.filter(sub => sub.genre === filters.genre);
        }
        
        if (filters.archived !== undefined) {
            submissions = submissions.filter(sub => sub.archived === filters.archived);
        }
        
        // Apply search query
        if (query) {
            const lowerQuery = query.toLowerCase();
            submissions = submissions.filter(sub => {
                return (
                    sub.artistName?.toLowerCase().includes(lowerQuery) ||
                    sub.songTitle?.toLowerCase().includes(lowerQuery) ||
                    sub.email?.toLowerCase().includes(lowerQuery) ||
                    sub.genre?.toLowerCase().includes(lowerQuery) ||
                    sub.keywords?.toLowerCase().includes(lowerQuery)
                );
            });
        }
        
        return submissions;
    }

    // Audit Log Functions
    static logAction(action, submissionId, adminUsername, details) {
        try {
            const logs = this.getAuditLogs();
            
            const logEntry = {
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                action,
                submissionId,
                adminUsername: adminUsername || 'system',
                details
            };
            
            logs.push(logEntry);
            
            // Keep only last 1000 logs to prevent file from getting too large
            if (logs.length > 1000) {
                logs.shift();
            }
            
            fs.writeFileSync(AUDIT_LOG_FILE, JSON.stringify(logs, null, 2));
        } catch (error) {
            console.error('Error logging action:', error);
        }
    }

    static getAuditLogs(limit = 50) {
        try {
            const data = fs.readFileSync(AUDIT_LOG_FILE, 'utf8');
            const logs = JSON.parse(data);
            return logs.slice(-limit).reverse();
        } catch (error) {
            console.error('Error reading audit logs:', error);
            return [];
        }
    }

    static getSubmissionAuditLogs(submissionId) {
        try {
            const data = fs.readFileSync(AUDIT_LOG_FILE, 'utf8');
            const logs = JSON.parse(data);
            return logs.filter(log => log.submissionId === submissionId).reverse();
        } catch (error) {
            console.error('Error reading submission audit logs:', error);
            return [];
        }
    }
}

module.exports = Submission;
