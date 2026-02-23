// app.js

// Functionality for notes
class Notes {
    constructor() {
        this.notes = [];
    }

    addNote(note) {
        this.notes.push(note);
    }

    getNotes() {
        return this.notes;
    }
}

// Functionality for Anki cards
class AnkiCard {
    constructor(question, answer) {
        this.question = question;
        this.answer = answer;
    }
}

class AnkiDeck {
    constructor() {
        this.cards = [];
    }

    addCard(card) {
        this.cards.push(card);
    }

    getCards() {
        return this.cards;
    }
}

// Functionality for Pomodoro Timer
class PomodoroTimer {
    constructor() {
        this.workDuration = 25; // in minutes
        this.breakDuration = 5; // in minutes
        this.isActive = false;
    }

    startWork() {
        this.isActive = true;
        console.log(`Work session started for ${this.workDuration} minutes.`);
        // Logic to start a timer
    }

    startBreak() {
        this.isActive = false;
        console.log(`Break started for ${this.breakDuration} minutes.`);
        // Logic to start a timer
    }
}